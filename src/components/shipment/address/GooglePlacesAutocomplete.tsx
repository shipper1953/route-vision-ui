
import { useRef, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Address } from "@/types/easypost";

declare global {
  interface Window {
    google: typeof google;
    initGooglePlaces: () => void;
    googleMapsScriptLoaded: boolean;
    googleMapsLoading: boolean;
  }
}

interface GooglePlacesAutocompleteProps {
  onAddressSelected: (address: Address) => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
}

export const GooglePlacesAutocomplete = ({
  onAddressSelected,
  placeholder = "Enter an address...",
  className = "",
  isLoading = false
}: GooglePlacesAutocompleteProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isScriptLoading, setIsScriptLoading] = useState(false);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const autocompleteElementRef = useRef<HTMLElement | null>(null);
  const [scriptLoadError, setScriptLoadError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  
  // Prevent multiple script loading attempts
  const loadGoogleMapsScript = () => {
    if (window.googleMapsLoading) {
      console.log("Google Maps script is already loading");
      return;
    }
    
    if (window.googleMapsScriptLoaded) {
      console.log("Google Maps API already loaded, initializing autocomplete");
      setupAutocompleteElement();
      return;
    }
    
    window.googleMapsLoading = true;
    setIsScriptLoading(true);
    
    // Create and append the script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBEc8QSEfbN44p7b1izuociU3CJBKPnSTo&libraries=places&callback=initGooglePlaces&v=beta&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      window.googleMapsLoading = false;
      setIsScriptLoading(false);
      setScriptLoadError("Failed to load Google Maps API. Please check your internet connection.");
      console.error("Google Maps API script failed to load");
    };
    
    document.body.appendChild(script);
    scriptRef.current = script;
  };

  // Initialize Google Places autocomplete
  useEffect(() => {
    // Define a global callback that will be called when the API is loaded
    window.initGooglePlaces = () => {
      window.googleMapsLoading = false;
      window.googleMapsScriptLoaded = true;
      setIsScriptLoading(false);
      console.log("Google Maps API loaded successfully");
      setupAutocompleteElement();
    };

    // Only attempt to load the script if it's not already loaded
    if (!window.googleMapsScriptLoaded) {
      loadGoogleMapsScript();
    } else if (window.google?.maps?.places?.PlaceAutocompleteElement) {
      // Script already loaded, just set up the element
      setupAutocompleteElement();
    }

    // Cleanup function
    return () => {
      // Clean up any event listeners if necessary
      if (autocompleteElementRef.current && containerRef.current) {
        try {
          // Remove event listeners
          autocompleteElementRef.current.removeEventListener("gmp-placeselect", () => {});
        } catch (e) {
          console.warn("Error cleaning up event listeners:", e);
        }
      }
    };
  }, [onAddressSelected, attemptCount]);

  // Setup the autocomplete element
  const setupAutocompleteElement = () => {
    if (!containerRef.current || !window.google?.maps?.places?.PlaceAutocompleteElement) {
      console.warn("Google Maps PlaceAutocompleteElement not available");
      return;
    }

    try {
      // Make sure container is empty first to prevent DOM issues
      if (containerRef.current.firstChild) {
        try {
          while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
          }
        } catch (e) {
          console.error("Error removing children from container:", e);
          // If we can't remove children, recreate the container entirely
          if (containerRef.current.parentNode) {
            const newContainer = document.createElement('div');
            newContainer.className = containerRef.current.className;
            newContainer.setAttribute('aria-label', containerRef.current.getAttribute('aria-label') || '');
            containerRef.current.parentNode.replaceChild(newContainer, containerRef.current);
            containerRef.current = newContainer as HTMLDivElement;
          }
        }
      }

      // Create the new PlaceAutocompleteElement with proper parameters
      const element = new window.google.maps.places.PlaceAutocompleteElement({
        types: ["address"],
        componentRestrictions: { country: "us" }
        // The 'fields' property is not supported in PlaceAutocompleteElement
      });
      
      element.style.width = "100%";
      element.style.height = "40px";
      element.style.borderRadius = "0.375rem";
      element.style.border = "1px solid #e2e8f0";
      element.style.padding = "0.5rem 0.75rem";
      
      containerRef.current.appendChild(element);
      autocompleteElementRef.current = element;

      console.log("PlaceAutocompleteElement added to DOM");

      // Add event listener for place selection
      element.addEventListener("gmp-placeselect", (event: any) => {
        const place = event.detail.place;
        
        if (!place) {
          console.log("No place details available");
          return;
        }

        console.log("Selected place:", place);
        
        // Fetch additional details needed for the address
        place.fetchFields({ fields: ["address_components", "formatted_address", "geometry"] })
          .then(() => {
            const address = transformGooglePlaceToAddress(place);
            onAddressSelected(address);
          })
          .catch((error: Error) => {
            console.error("Error fetching place details:", error);
            setScriptLoadError("Error fetching place details. Please try again.");
          });
      });
    } catch (error) {
      console.error("Error setting up PlaceAutocompleteElement:", error);
      setScriptLoadError(`Failed to initialize Google Maps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Transform Google place object to our Address format
  const transformGooglePlaceToAddress = (place: google.maps.places.Place): Address => {
    let street1 = "";
    let street2 = "";
    let city = "";
    let state = "";
    let zip = "";
    let country = "US";

    // Extract address components
    if (place.addressComponents) {
      place.addressComponents.forEach((component: any) => {
        const types = component.types;

        if (types.includes("street_number")) {
          street1 = component.longText || component.text;
        } else if (types.includes("route")) {
          const route = component.longText || component.text;
          street1 = street1 ? `${street1} ${route}` : route;
        } else if (types.includes("locality")) {
          city = component.longText || component.text;
        } else if (types.includes("administrative_area_level_1")) {
          state = component.shortText || component.text;
        } else if (types.includes("postal_code")) {
          zip = component.longText || component.text;
        } else if (types.includes("country")) {
          country = component.shortText || component.text;
        }
      });
    }

    // If we're missing the street, try to parse it from formatted address
    if (!street1 && place.formattedAddress) {
      const addressParts = place.formattedAddress.split(',');
      if (addressParts.length > 0) {
        street1 = addressParts[0].trim();
      }
    }

    return {
      street1,
      street2,
      city,
      state,
      zip,
      country,
      company: "",
      name: "",
      phone: "",
      email: ""
    };
  };

  const handleRetry = () => {
    setScriptLoadError(null);
    setAttemptCount(prev => prev + 1);
    
    // Reset state and try again
    if (scriptRef.current) {
      scriptRef.current.remove();
      scriptRef.current = null;
    }
    window.googleMapsLoading = false;
    window.googleMapsScriptLoaded = false;
    loadGoogleMapsScript();
  };

  if (scriptLoadError) {
    return (
      <div className={`relative ${className}`}>
        <Input
          type="text"
          placeholder={placeholder}
          disabled={true}
          className="w-full pr-10"
          ref={inputRef}
          aria-label="Address search input"
        />
        <div className="text-sm text-red-500 mt-1">
          {scriptLoadError}
          <button
            onClick={handleRetry}
            className="ml-2 text-blue-500 hover:underline"
            type="button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {(isLoading || isScriptLoading) && (
        <div className="absolute top-3 right-3 z-10">
          <LoadingSpinner size={16} />
        </div>
      )}
      <div 
        ref={containerRef} 
        className="w-full"
        aria-label="Address search input"
      >
        {/* Show input as placeholder while loading */}
        {(!window.google?.maps?.places?.PlaceAutocompleteElement || isScriptLoading) && (
          <Input
            type="text"
            placeholder={placeholder}
            disabled={isLoading || isScriptLoading}
            className="w-full pr-10"
            ref={inputRef}
            aria-label="Loading address search"
          />
        )}
      </div>
    </div>
  );
};


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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isScriptLoading, setIsScriptLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [scriptLoadError, setScriptLoadError] = useState<string | null>(null);
  const autocompleteRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const scriptId = "google-maps-script";
  
  // Load the Google Maps JavaScript API
  const loadGoogleMapsScript = () => {
    // Check if script already exists
    if (document.getElementById(scriptId)) {
      console.log("Google Maps script already exists in DOM");
      return;
    }
    
    if (window.googleMapsLoading) {
      console.log("Google Maps script is already loading");
      return;
    }
    
    if (window.googleMapsScriptLoaded) {
      console.log("Google Maps API already loaded");
      initAutocomplete();
      return;
    }
    
    window.googleMapsLoading = true;
    setIsScriptLoading(true);
    
    // Define global callback
    window.initGooglePlaces = () => {
      window.googleMapsLoading = false;
      window.googleMapsScriptLoaded = true;
      setIsScriptLoading(false);
      setGoogleLoaded(true);
      console.log("Google Maps API loaded successfully");
      initAutocomplete();
    };
    
    // Create and append script
    const script = document.createElement("script");
    script.id = scriptId;
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
  };

  // Clean up function to safely remove autocomplete
  const cleanupAutocomplete = () => {
    if (autocompleteRef.current) {
      try {
        autocompleteRef.current.remove();
        autocompleteRef.current = null;
      } catch (e) {
        console.warn("Error removing autocomplete element:", e);
      }
    }
  };

  // Initialize autocomplete
  const initAutocomplete = () => {
    try {
      if (!window.google?.maps?.places) {
        console.warn("Google Maps Places API not available");
        return;
      }

      cleanupAutocomplete();

      // Create standard input-based autocomplete
      if (inputRef.current) {
        const options = {
          componentRestrictions: { country: "us" },
          types: ["address"]
        };
        
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, options);
        
        // Add event listener for place selection
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place.geometry) {
            console.log("No place details available");
            return;
          }
          
          console.log("Selected place:", place);
          const address = transformGooglePlaceToAddress(place);
          onAddressSelected(address);
        });
      }

    } catch (error) {
      console.error("Error initializing autocomplete:", error);
      setScriptLoadError(`Failed to initialize Google Maps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Transform Google place object to our Address format
  const transformGooglePlaceToAddress = (place: google.maps.places.PlaceResult): Address => {
    let street1 = "";
    let street2 = "";
    let city = "";
    let state = "";
    let zip = "";
    let country = "US";

    // Extract address components
    if (place.address_components) {
      place.address_components.forEach(component => {
        const types = component.types;

        if (types.includes("street_number")) {
          street1 = component.long_name;
        } else if (types.includes("route")) {
          const route = component.long_name;
          street1 = street1 ? `${street1} ${route}` : route;
        } else if (types.includes("locality")) {
          city = component.long_name;
        } else if (types.includes("administrative_area_level_1")) {
          state = component.short_name;
        } else if (types.includes("postal_code")) {
          zip = component.long_name;
        } else if (types.includes("country")) {
          country = component.short_name;
        }
      });
    }

    // If we're missing the street, try to parse it from formatted address
    if (!street1 && place.formatted_address) {
      const addressParts = place.formatted_address.split(',');
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

  // Handle retry action
  const handleRetry = () => {
    setScriptLoadError(null);
    
    // Remove existing script if any
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      existingScript.remove();
    }
    
    // Reset loading state
    window.googleMapsLoading = false;
    window.googleMapsScriptLoaded = false;
    
    // Try loading again
    setTimeout(loadGoogleMapsScript, 500);
  };

  // Load Google Maps API on component mount
  useEffect(() => {
    loadGoogleMapsScript();
    
    // Cleanup on unmount
    return () => {
      cleanupAutocomplete();
    };
  }, []);

  // If there was an error loading the script, show error message with retry button
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
      <Input
        type="text"
        placeholder={placeholder}
        disabled={isLoading || isScriptLoading}
        className="w-full pr-10"
        ref={inputRef}
        aria-label="Address search input"
      />
    </div>
  );
};

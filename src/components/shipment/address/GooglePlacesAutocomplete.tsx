
import { useRef, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Address } from "@/types/easypost";

declare global {
  interface Window {
    google: typeof google;
    initGooglePlaces: () => void;
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
  const [isScriptLoading, setIsScriptLoading] = useState(false);
  const [autocompleteElement, setAutocompleteElement] = useState<HTMLElement | null>(null);

  // Initialize Google Places autocomplete
  useEffect(() => {
    // Only load the script once
    if (
      !document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]') &&
      !isScriptLoading
    ) {
      setIsScriptLoading(true);
      
      // Define callback for when Google Maps API is loaded
      window.initGooglePlaces = () => {
        setupAutocompleteElement();
        setIsScriptLoading(false);
      };

      // Load Google Maps API script with the updated libraries
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBEc8QSEfbN44p7b1izuociU3CJBKPnSTo&libraries=places&callback=initGooglePlaces&v=beta`;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      return () => {
        // Clean up
        if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
          document.body.removeChild(script);
        }
        window.initGooglePlaces = () => {};
      };
    } else if (window.google?.maps?.places && containerRef.current && !autocompleteElement) {
      setupAutocompleteElement();
    }
  }, []);

  const setupAutocompleteElement = () => {
    if (!containerRef.current || !window.google?.maps?.places?.PlaceAutocompleteElement) {
      console.warn("Google Maps PlaceAutocompleteElement not available");
      return;
    }

    try {
      // Clear the container first
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }

      // Create the new PlaceAutocompleteElement
      const element = new window.google.maps.places.PlaceAutocompleteElement({
        types: ["address"],
        componentRestrictions: { country: "us" }
      });
      
      element.style.width = "100%";
      element.style.height = "40px";
      element.style.borderRadius = "0.375rem";
      element.style.border = "1px solid #e2e8f0";
      element.style.padding = "0.5rem 0.75rem";
      
      containerRef.current.appendChild(element);
      setAutocompleteElement(element);

      // Add event listener for place selection
      element.addEventListener("gmp-placeselect", (event: any) => {
        const place = event.detail.place;
        
        if (!place) {
          console.log("No place details available");
          return;
        }

        console.log("Selected place:", place);
        
        // Fetch place details to get the address components
        place.fetchFields({ fields: ["address_components", "formatted_address", "geometry"] })
          .then(() => {
            const address = transformGooglePlaceToAddress(place);
            onAddressSelected(address);
          })
          .catch((error: Error) => {
            console.error("Error fetching place details:", error);
          });
      });
    } catch (error) {
      console.error("Error setting up PlaceAutocompleteElement:", error);
    }
  };

  // Transform Google place object to our Address format
  const transformGooglePlaceToAddress = (place: any): Address => {
    let street1 = "";
    let street2 = "";
    let city = "";
    let state = "";
    let zip = "";
    let country = "US";

    // Extract address components
    place.addressComponents?.forEach((component: any) => {
      const types = component.types;

      if (types.includes("street_number")) {
        street1 = component.longText;
      } else if (types.includes("route")) {
        street1 = street1 ? `${street1} ${component.longText}` : component.longText;
      } else if (types.includes("locality")) {
        city = component.longText;
      } else if (types.includes("administrative_area_level_1")) {
        state = component.shortText;
      } else if (types.includes("postal_code")) {
        zip = component.longText;
      } else if (types.includes("country")) {
        country = component.shortText;
      }
    });

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
        {!autocompleteElement && (
          <Input
            type="text"
            placeholder={placeholder}
            disabled={isLoading || isScriptLoading}
            className="w-full pr-10"
            aria-label="Loading address search"
          />
        )}
      </div>
    </div>
  );
};

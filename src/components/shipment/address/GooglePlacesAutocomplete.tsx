
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
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isScriptLoading, setIsScriptLoading] = useState(false);

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
        if (inputRef.current) {
          setupAutocomplete();
        }
        setIsScriptLoading(false);
      };

      // Load Google Maps API script
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBEc8QSEfbN44p7b1izuociU3CJBKPnSTo&libraries=places&callback=initGooglePlaces`;
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
    } else if (window.google?.maps?.places && inputRef.current) {
      setupAutocomplete();
    }
  }, []);

  const setupAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    // Create autocomplete instance
    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      { types: ["address"], componentRestrictions: { country: "us" } }
    );

    // Add listener for place selection
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      
      if (!place || !place.address_components) {
        console.log("No address details available");
        return;
      }

      console.log("Selected place:", place);

      // Transform Google place to our address format
      const address = transformGooglePlaceToAddress(place);
      onAddressSelected(address);
    });
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
    place.address_components?.forEach(component => {
      const types = component.types;

      if (types.includes("street_number")) {
        street1 = component.long_name;
      } else if (types.includes("route")) {
        street1 = street1 ? `${street1} ${component.long_name}` : component.long_name;
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
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        disabled={isLoading || isScriptLoading}
        className="w-full pr-10"
      />
    </div>
  );
};

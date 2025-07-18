
import { useRef, useState } from 'react';
import { loadGoogleMapsScript, isGoogleMapsLoaded } from '@/utils/googleMapsLoader';
import { Address } from '@/types/easypost';

interface UseGooglePlacesAutocompleteProps {
  onAddressSelected: (address: Address) => void;
}

export const useGooglePlacesAutocomplete = ({ onAddressSelected }: UseGooglePlacesAutocompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isScriptLoading, setIsScriptLoading] = useState(false);
  const [scriptLoadError, setScriptLoadError] = useState<string | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
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
  
  // Initialize autocomplete
  const initAutocomplete = () => {
    try {
      if (!isGoogleMapsLoaded()) {
        console.warn("Google Maps Places API not available");
        return;
      }

      // Clean up any existing autocomplete
      if (autocompleteRef.current) {
        autocompleteRef.current = null;
      }

      // Create autocomplete instance
      if (inputRef.current) {
        const options = {
          componentRestrictions: { country: "us" },
          types: ["address"]
        };
        
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, options);
        autocompleteRef.current = autocomplete;
        
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

  // Load Google Maps API and initialize autocomplete
  const loadAndInitAutocomplete = async () => {
    try {
      setIsScriptLoading(true);
      setScriptLoadError(null);
      
      await loadGoogleMapsScript();
      
      setIsScriptLoading(false);
      initAutocomplete();
    } catch (error) {
      console.error("Error loading Google Maps:", error);
      setIsScriptLoading(false);
      
      if (error instanceof Error && error.message.includes("API key not configured")) {
        setScriptLoadError("Google Maps API key not configured. Address autocomplete is disabled.");
      } else {
        setScriptLoadError(`Failed to load Google Maps: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };
  
  // Handle retry action
  const handleRetry = () => {
    loadAndInitAutocomplete();
  };

  return {
    inputRef,
    isScriptLoading,
    scriptLoadError,
    handleRetry,
    initAutocomplete,
    loadAndInitAutocomplete
  };
};

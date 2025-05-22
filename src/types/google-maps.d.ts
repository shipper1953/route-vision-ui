
declare namespace google {
  namespace maps {
    namespace places {
      class Autocomplete {
        constructor(
          inputElement: HTMLInputElement, 
          options?: AutocompleteOptions
        );
        addListener(eventName: string, handler: Function): google.maps.MapsEventListener;
        getPlace(): PlaceResult;
      }
      
      interface AutocompleteOptions {
        bounds?: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral;
        componentRestrictions?: ComponentRestrictions;
        fields?: string[];
        placeIdOnly?: boolean;
        strictBounds?: boolean;
        types?: string[];
      }
      
      interface ComponentRestrictions {
        country: string | string[];
      }
      
      interface PlaceResult {
        address_components?: AddressComponent[];
        formatted_address?: string;
        geometry?: {
          location: google.maps.LatLng;
          viewport: google.maps.LatLngBounds;
        };
        place_id?: string;
        name?: string;
        types?: string[];
      }
      
      interface AddressComponent {
        long_name: string;
        short_name: string;
        types: string[];
      }
      
      class PlaceAutocompleteElement extends HTMLElement {
        constructor(options?: {
          types?: string[];
          componentRestrictions?: ComponentRestrictions;
          fields?: string[];
        });
        
        addEventListener(type: string, listener: EventListener): void;
        removeEventListener(type: string, listener: EventListener): void;
        style: CSSStyleDeclaration;
      }

      interface Place {
        addressComponents?: {
          types: string[];
          longText: string;
          shortText: string;
        }[];
        formattedAddress?: string;
        fetchFields(options: { fields: string[] }): Promise<void>;
      }

      interface PlaceSelectEvent extends Event {
        detail: {
          place: Place;
        };
      }
    }
    
    interface MapsEventListener {
      remove(): void;
    }
    
    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
      toString(): string;
    }
    
    class LatLngBounds {
      constructor(sw?: google.maps.LatLng, ne?: google.maps.LatLng);
      contains(latLng: google.maps.LatLng): boolean;
      extend(latLng: google.maps.LatLng): google.maps.LatLngBounds;
    }
    
    interface LatLngBoundsLiteral {
      east: number;
      north: number;
      south: number;
      west: number;
    }
  }
}

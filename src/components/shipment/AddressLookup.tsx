
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAddressLookup } from "@/hooks/useAddressLookup";
import { GeoapifyContext, GeoapifyGeocoderAutocomplete } from '@geoapify/react-geocoder-autocomplete';
import '@geoapify/geocoder-autocomplete/styles/minimal.css';

interface AddressLookupProps {
  type: "from" | "to";
  className?: string;
}

export const AddressLookup = ({ type, className }: AddressLookupProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const {
    searchQuery,
    setSearchQuery,
    isLoading,
    handleSelectAddress
  } = useAddressLookup(type);

  // Log when component mounts to verify it's working
  useEffect(() => {
    console.log(`AddressLookup component mounted for ${type} address`);
  }, [type]);

  const onPlaceSelect = async (place: any) => {
    if (!place) return;
    
    console.log('Place selected:', place);
    
    // Transform the Geoapify place object to our address format
    const address = {
      street1: place.properties.address_line1 || 
        `${place.properties.housenumber || ''} ${place.properties.street || ''}`.trim(),
      street2: place.properties.address_line2 || '',
      city: place.properties.city || place.properties.county || '',
      state: place.properties.state || place.properties.state_code || '',
      zip: place.properties.postcode || '',
      country: place.properties.country_code?.toUpperCase() || 'US',
      company: '',
      name: '',
      phone: '',
      email: '',
    };

    const success = await handleSelectAddress(address);
    if (success) {
      setIsOpen(false);
      toast.success("Address selected successfully");
    }
  };

  const onSuggestionChange = (suggestions: any) => {
    console.log('Suggestions changed:', suggestions);
  };

  // Get Geoapify API key 
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY || "274bcb0749944615912f9997d5c49105";

  return (
    <div className={cn("mb-4", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full flex justify-between items-center"
            onClick={() => {
              console.log(`AddressLookup button clicked for ${type}`);
              setIsOpen(true);
            }}
          >
            <span>Look up address</span>
            <Search className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-4" align="start">
          <div className="space-y-4">
            <h4 className="font-medium">Find Address</h4>
            
            <GeoapifyContext apiKey={apiKey}>
              <GeoapifyGeocoderAutocomplete
                placeholder="Enter address to search..."
                type="street"
                limit={5}
                placeSelect={onPlaceSelect}
                suggestionsChange={onSuggestionChange}
                debounceDelay={500}
              />
            </GeoapifyContext>
            
            <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
              Search for an address to auto-fill the form
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

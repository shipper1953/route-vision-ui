
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { GooglePlacesAutocomplete } from "@/components/shipment/address/GooglePlacesAutocomplete";
import { useOrderAddressLookup } from "@/hooks/useOrderAddressLookup";

interface OrderAddressLookupProps {
  className?: string;
}

export const OrderAddressLookup = ({ className }: OrderAddressLookupProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const {
    isLoading,
    handleSelectAddress
  } = useOrderAddressLookup();

  const handleOpenChange = (open: boolean) => {
    console.log(`Address lookup popover ${open ? 'opening' : 'closing'} for order`);
    setIsOpen(open);
  };

  const handleAddressSelected = async (address: any) => {
    try {
      const success = await handleSelectAddress(address);
      if (success) {
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Error handling address selection:", error);
    }
  };

  return (
    <div className={cn("mb-4", className)}>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full flex justify-between items-center"
            type="button"
          >
            <span>Look up shipping address</span>
            <Search className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-4" align="start">
          <div className="space-y-4">
            <h4 className="font-medium">Find Shipping Address</h4>
            
            {isOpen && (
              <GooglePlacesAutocomplete
                placeholder="Enter shipping address to search..."
                onAddressSelected={handleAddressSelected}
                isLoading={isLoading}
              />
            )}
            
            <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
              Search for an address to auto-fill the shipping address fields
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

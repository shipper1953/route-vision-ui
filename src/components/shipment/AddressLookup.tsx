
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
import { GooglePlacesAutocomplete } from "./address/GooglePlacesAutocomplete";

interface AddressLookupProps {
  type: "from" | "to";
  className?: string;
}

export const AddressLookup = ({ type, className }: AddressLookupProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const {
    isLoading,
    handleSelectAddress
  } = useAddressLookup(type);

  // Log when component mounts to verify it's working
  useEffect(() => {
    console.log(`AddressLookup component mounted for ${type} address`);
  }, [type]);

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
            
            <GooglePlacesAutocomplete
              placeholder="Enter address to search..."
              onAddressSelected={async (address) => {
                const success = await handleSelectAddress(address);
                if (success) {
                  setIsOpen(false);
                  toast.success("Address selected successfully");
                }
              }}
              isLoading={isLoading}
            />
            
            <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
              Search for an address to auto-fill the form
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

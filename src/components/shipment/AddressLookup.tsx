
import { useState, useRef, useEffect } from "react";
import { Search, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";
import { cn } from "@/lib/utils";
import { Address } from "@/types/easypost";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import geoapifyService from "@/services/geoapify/geoapifyService";
import easyPostService from "@/services/easypost";

interface AddressLookupProps {
  type: "from" | "to";
  className?: string;
}

export const AddressLookup = ({ type, className }: AddressLookupProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const form = useFormContext<ShipmentForm>();
  const prefix = type;

  // Log when component mounts to verify it's working
  useEffect(() => {
    console.log(`AddressLookup component mounted for ${type} address`);
  }, [type]);

  const handleSearch = async () => {
    if (searchQuery.length < 3) {
      toast.warning("Please enter at least 3 characters to search");
      return;
    }
    
    setIsLoading(true);
    setResults([]);
    setSearchError(null);
    
    try {
      console.log('Starting address lookup with query:', searchQuery);
      
      // Use Geoapify service for address lookup
      const addresses = await geoapifyService.searchAddresses(searchQuery);
      
      console.log('Address lookup results:', addresses);
      setResults(addresses);
      
      if (addresses.length === 0) {
        setSearchError("No addresses found. Try a different search term.");
        toast.info("No addresses found. Try a different search term.");
      }
    } catch (error) {
      console.error("Error looking up address:", error);
      setSearchError("Failed to look up address. Please try again.");
      toast.error("Failed to look up address. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAddress = async (address: Address) => {
    try {
      setIsLoading(true);
      
      console.log('Selected address for verification:', address);
      
      // Fill in the form with the selected address
      // Optionally verify with EasyPost if API key is available
      let verifiedAddress = address;
      
      if (import.meta.env.VITE_EASYPOST_API_KEY || import.meta.env.EASYPOST_API_KEY) {
        try {
          const verificationResult = await easyPostService.verifyAddress(address);
          if (verificationResult.verifications?.delivery.success) {
            verifiedAddress = verificationResult.address;
            toast.success("Address verified successfully");
          } else {
            toast.warning("Address could not be fully verified, using as provided");
          }
        } catch (error) {
          console.error("Error verifying address with EasyPost:", error);
          toast.warning("Address validation skipped, using as provided");
        }
      } else {
        console.log("EasyPost API key not available, skipping verification");
      }
      
      // Fill in the form with the address
      form.setValue(`${prefix}Street1`, verifiedAddress.street1);
      form.setValue(`${prefix}Street2`, verifiedAddress.street2 || "");
      form.setValue(`${prefix}City`, verifiedAddress.city);
      form.setValue(`${prefix}State`, verifiedAddress.state);
      form.setValue(`${prefix}Zip`, verifiedAddress.zip);
      form.setValue(`${prefix}Country`, verifiedAddress.country);
      
      // Clear validation errors for the fields
      form.clearErrors(`${prefix}Street1`);
      form.clearErrors(`${prefix}City`);
      form.clearErrors(`${prefix}State`);
      form.clearErrors(`${prefix}Zip`);
      form.clearErrors(`${prefix}Country`);
      
      setIsOpen(false);
      toast.success("Address selected successfully");
    } catch (error) {
      console.error("Error processing selected address:", error);
      toast.error("Failed to process selected address");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("mb-4", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full flex justify-between items-center"
            onClick={() => setIsOpen(true)}
          >
            <span>Look up address</span>
            <Search className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 space-y-4">
            <div className="flex space-x-2">
              <Input
                ref={searchInputRef}
                placeholder="Enter street, city, or zip..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                className="flex-1"
                autoFocus
              />
              <Button 
                onClick={handleSearch} 
                disabled={searchQuery.length < 3 || isLoading}
              >
                {isLoading ? (
                  <LoadingSpinner size={16} />
                ) : (
                  "Search"
                )}
              </Button>
            </div>
            
            {searchError && (
              <p className="text-sm text-destructive text-center">{searchError}</p>
            )}
            
            {results.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {results.map((address, index) => (
                  <div 
                    key={index}
                    className="p-2 hover:bg-muted rounded cursor-pointer flex items-start gap-2"
                    onClick={() => handleSelectAddress(address)}
                  >
                    <Navigation className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{address.street1}</p>
                      {address.street2 && <p className="text-sm">{address.street2}</p>}
                      <p className="text-sm text-muted-foreground">
                        {address.city}, {address.state} {address.zip}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              searchQuery.length >= 3 && !isLoading && !searchError && (
                <p className="text-sm text-muted-foreground text-center py-2">No results found</p>
              )
            )}
            
            <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
              Search for an address to auto-fill the form
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

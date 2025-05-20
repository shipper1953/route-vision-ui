import { useState } from "react";
import { Search } from "lucide-react";
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
import easyPostService, { Address } from "@/services/easypost";
import { toast } from "sonner";

interface AddressLookupProps {
  type: "from" | "to";
  className?: string;
}

export const AddressLookup = ({ type, className }: AddressLookupProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const form = useFormContext<ShipmentForm>();
  const prefix = type;

  const handleSearch = async () => {
    if (searchQuery.length < 3) return;
    
    setIsLoading(true);
    setResults([]);
    try {
      // Use EasyPost service for address lookup
      const addresses = await easyPostService.verifyAddresses(searchQuery);
      setResults(addresses);
      
      if (addresses.length === 0) {
        toast.info("No addresses found. Try a different search term.");
      }
    } catch (error) {
      console.error("Error looking up address:", error);
      toast.error("Failed to look up address. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAddress = async (address: Address) => {
    try {
      setIsLoading(true);
      
      // Verify the selected address
      const verificationResult = await easyPostService.verifyAddress(address);
      const verifiedAddress = verificationResult.address;
      
      // Check if the address was verified successfully
      if (verificationResult.verifications?.delivery.success) {
        // Fill in the form with the verified address
        form.setValue(`${prefix}Street1`, verifiedAddress.street1);
        form.setValue(`${prefix}Street2`, verifiedAddress.street2 || "");
        form.setValue(`${prefix}City`, verifiedAddress.city);
        form.setValue(`${prefix}State`, verifiedAddress.state);
        form.setValue(`${prefix}Zip`, verifiedAddress.zip);
        form.setValue(`${prefix}Country`, verifiedAddress.country);
        
        toast.success("Address verified and populated successfully");
      } else {
        // Address verification failed but still populate form
        form.setValue(`${prefix}Street1`, address.street1);
        form.setValue(`${prefix}Street2`, address.street2 || "");
        form.setValue(`${prefix}City`, address.city);
        form.setValue(`${prefix}State`, address.state);
        form.setValue(`${prefix}Zip`, address.zip);
        form.setValue(`${prefix}Country`, address.country);
        
        toast.warning("Address populated but could not be fully verified");
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error("Error verifying address:", error);
      toast.error("Failed to verify address. Using as provided.");
      
      // Fill in form with unverified address
      form.setValue(`${prefix}Street1`, address.street1);
      form.setValue(`${prefix}Street2`, address.street2 || "");
      form.setValue(`${prefix}City`, address.city);
      form.setValue(`${prefix}State`, address.state);
      form.setValue(`${prefix}Zip`, address.zip);
      form.setValue(`${prefix}Country`, address.country);
      
      setIsOpen(false);
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
              />
              <Button 
                onClick={handleSearch} 
                disabled={searchQuery.length < 3 || isLoading}
              >
                {isLoading ? "..." : "Search"}
              </Button>
            </div>
            
            {results.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {results.map((address, index) => (
                  <div 
                    key={index}
                    className="p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => handleSelectAddress(address)}
                  >
                    <p className="font-medium">{address.street1}</p>
                    {address.street2 && <p className="text-sm">{address.street2}</p>}
                    <p className="text-sm text-muted-foreground">
                      {address.city}, {address.state} {address.zip}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              searchQuery.length >= 3 && !isLoading && (
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

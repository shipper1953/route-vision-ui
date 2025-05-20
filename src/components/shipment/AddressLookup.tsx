
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

// Mock address lookup service - in a real app, this would connect to a service like Google Places API
const mockAddressLookup = async (query: string): Promise<any[]> => {
  // This is just sample data - in a real implementation, this would call an actual API
  const addresses = [
    {
      street1: "123 Main St",
      street2: "Suite 100",
      city: "Boston",
      state: "MA",
      zip: "02108",
      country: "US",
    },
    {
      street1: "456 Park Ave",
      street2: "",
      city: "New York",
      state: "NY",
      zip: "10022",
      country: "US",
    },
    {
      street1: "789 Market St",
      street2: "",
      city: "San Francisco",
      state: "CA",
      zip: "94103",
      country: "US",
    },
  ];

  return addresses.filter((address) => 
    address.street1.toLowerCase().includes(query.toLowerCase()) || 
    address.city.toLowerCase().includes(query.toLowerCase())
  );
};

interface AddressLookupProps {
  type: "from" | "to";
  className?: string;
}

export const AddressLookup = ({ type, className }: AddressLookupProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const form = useFormContext<ShipmentForm>();
  const prefix = type;

  const handleSearch = async () => {
    if (searchQuery.length < 3) return;
    
    setIsLoading(true);
    try {
      const addresses = await mockAddressLookup(searchQuery);
      setResults(addresses);
    } catch (error) {
      console.error("Error looking up address:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAddress = (address: any) => {
    form.setValue(`${prefix}Street1`, address.street1);
    form.setValue(`${prefix}Street2`, address.street2);
    form.setValue(`${prefix}City`, address.city);
    form.setValue(`${prefix}State`, address.state);
    form.setValue(`${prefix}Zip`, address.zip);
    form.setValue(`${prefix}Country`, address.country);
    
    setIsOpen(false);
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
                placeholder="Enter street or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              <div className="space-y-2">
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

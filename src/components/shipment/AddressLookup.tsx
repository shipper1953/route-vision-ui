
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
import { AddressSearchInput } from "./address/AddressSearchInput";
import { AddressResultsList } from "./address/AddressResultsList";

interface AddressLookupProps {
  type: "from" | "to";
  className?: string;
}

export const AddressLookup = ({ type, className }: AddressLookupProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const {
    searchQuery,
    setSearchQuery,
    results,
    isLoading,
    searchError,
    handleSearch,
    handleSelectAddress
  } = useAddressLookup(type);

  // Log when component mounts to verify it's working
  useEffect(() => {
    console.log(`AddressLookup component mounted for ${type} address`);
  }, [type]);

  // Automatically search if the user has typed more than 3 characters
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.length >= 3 && isOpen && !isLoading) {
        console.log("Auto-searching after debounce:", searchQuery);
        handleSearch();
      }
    }, 1500); // Increased debounce time to reduce API calls and allow for more complete typing
    
    return () => clearTimeout(delaySearch);
  }, [searchQuery, isOpen, isLoading, handleSearch]);

  const onSelectAddress = async (address: any) => {
    console.log('Address selected in AddressLookup:', address);
    const success = await handleSelectAddress(address);
    if (success) {
      setIsOpen(false);
      toast.success("Address selected successfully");
    }
  };

  return (
    <div className={cn("mb-4", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full flex justify-between items-center"
            onClick={() => {
              console.log(`AddressLookup button clicked for ${type}`);
              setSearchQuery(""); // Clear previous search
              setIsOpen(true);
            }}
          >
            <span>Look up address</span>
            <Search className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 space-y-4">
            <AddressSearchInput
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSearch={handleSearch}
              isLoading={isLoading}
            />
            
            <AddressResultsList
              results={results}
              onSelectAddress={onSelectAddress}
              isLoading={isLoading}
              searchError={searchError}
              searchQuery={searchQuery}
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

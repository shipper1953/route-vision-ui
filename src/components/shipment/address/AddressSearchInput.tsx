
import { useState, useRef } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface AddressSearchInputProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: () => void;
  isLoading: boolean;
}

export const AddressSearchInput = ({
  searchQuery,
  setSearchQuery,
  onSearch,
  isLoading
}: AddressSearchInputProps) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex space-x-2">
      <Input
        ref={searchInputRef}
        placeholder="Enter street, city, or zip..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onSearch();
          }
        }}
        className="flex-1"
        autoFocus
      />
      <Button 
        onClick={onSearch} 
        disabled={searchQuery.length < 3 || isLoading}
      >
        {isLoading ? (
          <LoadingSpinner size={16} />
        ) : (
          "Search"
        )}
      </Button>
    </div>
  );
};

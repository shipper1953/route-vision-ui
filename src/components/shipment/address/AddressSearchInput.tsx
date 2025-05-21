
import { useRef, useState } from "react";
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
  const [hasFocus, setHasFocus] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2">
      <Input
        ref={searchInputRef}
        placeholder="Enter street, city, or zip..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setHasFocus(true)}
        onBlur={() => setHasFocus(false)}
        className={`flex-1 ${hasFocus ? 'border-primary' : ''}`}
        autoFocus
      />
      <Button 
        type="submit"
        disabled={searchQuery.length < 3 || isLoading}
        className="bg-tms-blue hover:bg-tms-blue-600"
      >
        {isLoading ? (
          <LoadingSpinner size={16} />
        ) : (
          <Search className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
};

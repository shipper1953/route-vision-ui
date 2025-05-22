
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ShipmentsSearchProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const ShipmentsSearch = ({ searchTerm, setSearchTerm }: ShipmentsSearchProps) => {
  return (
    <div className="relative w-64">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        placeholder="Search by tracking or carrier..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-9"
      />
    </div>
  );
};

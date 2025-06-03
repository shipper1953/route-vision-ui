
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface UsersSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export const UsersSearch = ({ searchTerm, onSearchChange }: UsersSearchProps) => {
  return (
    <div className="relative w-64">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        placeholder="Search users..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-9"
      />
    </div>
  );
};

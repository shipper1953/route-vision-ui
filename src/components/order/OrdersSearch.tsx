
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface OrdersSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filteredCount: number;
  totalCount: number;
  isLoading: boolean;
}

export const OrdersSearch = ({ 
  searchTerm, 
  onSearchChange,
  filteredCount,
  totalCount,
  isLoading
}: OrdersSearchProps) => {
  return (
    <div className="flex justify-between items-center">
      <div className="text-sm text-muted-foreground">
        {isLoading 
          ? "Loading orders..." 
          : `Showing ${filteredCount} of ${totalCount} orders`}
      </div>
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search orders..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
};

import { Checkbox } from "@/components/ui/checkbox";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BulkShipTableHeaderProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: (checked: boolean) => void;
}

export const BulkShipTableHeader = ({ 
  selectedCount, 
  totalCount, 
  onSelectAll 
}: BulkShipTableHeaderProps) => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-12">
          <Checkbox
            checked={selectedCount === totalCount && totalCount > 0}
            onCheckedChange={onSelectAll}
            aria-label="Select all orders"
          />
        </TableHead>
        <TableHead>Order ID</TableHead>
        <TableHead>Customer</TableHead>
        <TableHead>Items/SKUs</TableHead>
        <TableHead>Value</TableHead>
        <TableHead>Destination</TableHead>
        <TableHead>Service</TableHead>
      </TableRow>
    </TableHeader>
  );
};
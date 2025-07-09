import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { getItemsDisplay } from "../utils/orderDisplayUtils";

interface OrderForShipping {
  id: string;
  customerName: string;
  items: any[];
  value: number;
  shippingAddress: any;
  recommendedBox: any;
  recommendedService?: string;
  packageWeight?: {
    itemsWeight: number;
    boxWeight: number;
    totalWeight: number;
  };
}

interface BulkShipTableRowProps {
  order: OrderForShipping;
  isSelected: boolean;
  onSelectOrder: (orderId: string, checked: boolean) => void;
}

export const BulkShipTableRow = ({
  order,
  isSelected,
  onSelectOrder
}: BulkShipTableRowProps) => {
  return (
    <TableRow>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectOrder(order.id, checked as boolean)}
          aria-label={`Select order ${order.id}`}
        />
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-mono">
          {order.id}
        </Badge>
      </TableCell>
      <TableCell className="font-medium">{order.customerName}</TableCell>
      <TableCell className="max-w-xs">
        <div className="text-sm text-muted-foreground truncate" title={getItemsDisplay(order.items)}>
          {getItemsDisplay(order.items)}
        </div>
      </TableCell>
      <TableCell>${order.value.toFixed(2)}</TableCell>
      <TableCell>
        {order.shippingAddress ? 
          `${order.shippingAddress.city}, ${order.shippingAddress.state}` : 
          'Unknown'
        }
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <Badge variant="secondary">
            {order.recommendedService || 'Ground'}
          </Badge>
          {order.recommendedBox && (
            <div className="text-xs text-muted-foreground">
              Box: {order.recommendedBox.name}
            </div>
          )}
          {order.packageWeight && (
            <div className="text-xs text-muted-foreground">
              {order.packageWeight.totalWeight.toFixed(1)} lbs
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};
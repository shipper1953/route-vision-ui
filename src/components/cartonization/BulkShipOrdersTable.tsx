
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Package } from "lucide-react";
import { toast } from "sonner";

interface OrderForShipping {
  id: string;
  customerName: string;
  items: any[];
  value: number;
  shippingAddress: any;
  recommendedBox: any;
  recommendedService?: string;
}

interface BulkShipOrdersTableProps {
  boxName: string;
  boxDimensions: string;
  orders: OrderForShipping[];
  onBulkShip: (selectedOrders: OrderForShipping[]) => void;
}

export const BulkShipOrdersTable = ({ boxName, boxDimensions, orders, onBulkShip }: BulkShipOrdersTableProps) => {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isShipping, setIsShipping] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(orders.map(order => order.id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleBulkShip = async () => {
    if (selectedOrders.size === 0) {
      toast.error("Please select at least one order to ship");
      return;
    }

    setIsShipping(true);
    try {
      const ordersToShip = orders.filter(order => selectedOrders.has(order.id));
      await onBulkShip(ordersToShip);
      toast.success(`Successfully initiated shipping for ${ordersToShip.length} orders`);
      setSelectedOrders(new Set()); // Clear selection after successful shipping
    } catch (error) {
      console.error('Bulk shipping error:', error);
      toast.error("Failed to initiate bulk shipping. Please try again.");
    } finally {
      setIsShipping(false);
    }
  };

  const getItemsDisplay = (items: any[]) => {
    if (!Array.isArray(items) || items.length === 0) return "No items";
    
    return items.map((item, idx) => {
      const name = item.name || item.description || `Item ${idx + 1}`;
      const quantity = item.quantity || item.count || 1;
      return `${name} (${quantity})`;
    }).join(", ");
  };

  if (orders.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-tms-blue" />
            <CardTitle className="text-lg">
              Orders for {boxName} ({boxDimensions})
            </CardTitle>
            <Badge variant="secondary">{orders.length} orders</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedOrders.size} selected
            </span>
            <Button 
              onClick={handleBulkShip}
              disabled={selectedOrders.size === 0 || isShipping}
              size="sm"
              className="gap-2"
            >
              <Truck className="h-4 w-4" />
              {isShipping ? "Shipping..." : `Ship Selected (${selectedOrders.size})`}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedOrders.size === orders.length && orders.length > 0}
                  onCheckedChange={handleSelectAll}
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
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedOrders.has(order.id)}
                    onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
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
                  <Badge variant="secondary">
                    {order.recommendedService || 'Ground'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

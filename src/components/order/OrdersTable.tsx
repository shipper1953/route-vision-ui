
import { OrderData } from "@/types/orderTypes";
import { useNavigate } from "react-router-dom";
import { Truck } from "lucide-react";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { OrderStatus } from "./OrderStatus";
import { OrderShipmentInfo } from "./OrderShipmentInfo";

interface OrdersTableProps {
  orders: OrderData[];
  filteredOrders: OrderData[];
  highlightedOrderId: string | null;
  isLoading: boolean;
}

export const OrdersTable = ({ 
  orders, 
  filteredOrders, 
  highlightedOrderId, 
  isLoading 
}: OrdersTableProps) => {
  const navigate = useNavigate();

  const handleCreateShipmentForOrder = (orderId: string) => {
    // Navigate to create shipment page with the order ID
    navigate(`/create-shipment?orderId=${orderId}`);
  };

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={9} className="h-24 text-center">
          Loading orders...
        </TableCell>
      </TableRow>
    );
  }

  if (filteredOrders.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={9} className="h-24 text-center">
          {orders.length === 0 ? 
            "No orders found in database. Create your first order!" : 
            "No orders match your search criteria."}
        </TableCell>
      </TableRow>
    );
  }

  console.log("Rendering orders table with", filteredOrders.length, "filtered orders");

  return (
    <>
      {filteredOrders.map((order) => (
        <TableRow 
          key={order.id} 
          className={highlightedOrderId === order.id ? "bg-blue-50" : ""}
        >
          <TableCell className="font-medium">{order.id}</TableCell>
          <TableCell>{order.customerName}</TableCell>
          <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
          <TableCell>{new Date(order.requiredDeliveryDate).toLocaleDateString()}</TableCell>
          <TableCell>{order.items}</TableCell>
          <TableCell>
            <OrderStatus status={order.status} />
          </TableCell>
          <TableCell>
            <OrderShipmentInfo shipment={order.shipment} />
          </TableCell>
          <TableCell className="text-right">${order.value}</TableCell>
          <TableCell>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm">Details</Button>
              {(order.status === 'ready_to_ship' || order.status === 'processing') && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleCreateShipmentForOrder(order.id)}
                  className="flex items-center gap-1"
                >
                  <Truck className="h-3.5 w-3.5" />
                  Ship
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};

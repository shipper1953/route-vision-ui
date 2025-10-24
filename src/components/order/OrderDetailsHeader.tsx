
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit } from "lucide-react";
import { OrderData } from "@/types/orderTypes";

interface OrderDetailsHeaderProps {
  order: OrderData;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'secondary';
    case 'processing':
      return 'default';
    case 'ready_to_ship':
      return 'default';
    case 'shipped':
      return 'default';
    case 'delivered':
      return 'default';
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export const OrderDetailsHeader = ({ order }: OrderDetailsHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/orders")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Order {order.id}</h1>
          <p className="text-muted-foreground">Order details and information</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={getStatusBadgeVariant(order.status)}>
          {order.status.replace('_', ' ')}
        </Badge>
        {order.status !== 'shipped' && 
         order.status !== 'delivered' && 
         order.status !== 'partially_fulfilled' && (
          <Button onClick={() => navigate(`/orders/${order.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Order
          </Button>
        )}
      </div>
    </div>
  );
};

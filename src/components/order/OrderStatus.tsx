
import { Badge } from "@/components/ui/badge";

interface OrderStatusProps {
  status: string;
}

export const OrderStatus = ({ status }: OrderStatusProps) => {
  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'ready_to_ship':
        return { label: 'Ready to Ship', variant: 'warning' };
      case 'partially_fulfilled':
        return { label: 'Partially Fulfilled', variant: 'secondary' };
      case 'shipped':
        return { label: 'Shipped', variant: 'default' };
      case 'in_transit':
        return { label: 'In Transit', variant: 'secondary' };
      case 'delivered':
        return { label: 'Delivered', variant: 'success' };
      case 'cancelled':
        return { label: 'Cancelled', variant: 'destructive' };
      case 'on_hold':
        return { label: 'On Hold', variant: 'secondary' };
      default:
        return { label: status, variant: 'outline' };
    }
  };

  const { label, variant } = getStatusDetails(status);
  return <Badge variant={variant as any}>{label}</Badge>;
};

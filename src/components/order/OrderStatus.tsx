
import { Badge } from "@/components/ui/badge";

interface OrderStatusProps {
  status: string;
}

export const OrderStatus = ({ status }: OrderStatusProps) => {
  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'processing':
        return { label: 'Processing', variant: 'outline' };
      case 'ready_to_ship':
        return { label: 'Ready to Ship', variant: 'warning' };
      case 'shipped':
        return { label: 'Shipped', variant: 'default' };
      case 'delivered':
        return { label: 'Delivered', variant: 'success' };
      default:
        return { label: status, variant: 'outline' };
    }
  };

  const { label, variant } = getStatusDetails(status);
  return <Badge variant={variant as any}>{label}</Badge>;
};

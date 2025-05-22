
import { Badge } from "@/components/ui/badge";

interface ShipmentStatusProps {
  status: string;
}

export const ShipmentStatus = ({ status }: ShipmentStatusProps) => {
  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'created':
        return { label: 'Label Created', variant: 'outline' };
      case 'in_transit':
        return { label: 'In Transit', variant: 'default' };
      case 'out_for_delivery':
        return { label: 'Out for Delivery', variant: 'warning' };
      case 'delivered':
        return { label: 'Delivered', variant: 'success' };
      case 'purchased':
        return { label: 'Label Purchased', variant: 'success' };
      case 'exception':
        return { label: 'Exception', variant: 'destructive' };
      default:
        return { label: status, variant: 'outline' };
    }
  };

  const { label, variant } = getStatusDetails(status);
  return <Badge variant={variant as any}>{label}</Badge>;
};

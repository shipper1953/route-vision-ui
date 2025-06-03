
import { Badge } from "@/components/ui/badge";

interface UserStatusBadgeProps {
  status: string;
}

export const UserStatusBadge = ({ status }: UserStatusBadgeProps) => {
  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Active', variant: 'success' };
      case 'inactive':
        return { label: 'Inactive', variant: 'outline' };
      case 'pending':
        return { label: 'Pending', variant: 'warning' };
      default:
        return { label: status, variant: 'outline' };
    }
  };

  const { label, variant } = getStatusDetails(status);
  return <Badge variant={variant as any}>{label}</Badge>;
};

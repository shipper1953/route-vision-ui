
import { Badge } from "@/components/ui/badge";

interface UserRoleBadgeProps {
  role: string;
}

export const UserRoleBadge = ({ role }: UserRoleBadgeProps) => {
  const getRoleDetails = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin', variant: 'default' };
      case 'user':
        return { label: 'User', variant: 'secondary' };
      default:
        return { label: role, variant: 'outline' };
    }
  };

  const { label, variant } = getRoleDetails(role);
  return <Badge variant={variant as any}>{label}</Badge>;
};

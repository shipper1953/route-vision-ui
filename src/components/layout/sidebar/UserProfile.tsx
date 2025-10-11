
import { useAuth } from "@/hooks/useAuth";

interface UserProfileProps {
  isCollapsed: boolean;
}

export const UserProfile = ({ isCollapsed }: UserProfileProps) => {
  const { userProfile, user } = useAuth();

  if (isCollapsed) return null;

  // Get user initials from name or email
  const getInitials = () => {
    if (userProfile?.name) {
      return userProfile.name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Get display name
  const getDisplayName = () => {
    return userProfile?.name || user?.email?.split('@')[0] || 'User';
  };

  // Get role display
  const getRoleDisplay = () => {
    if (userProfile?.role === 'super_admin') return 'Super Administrator';
    if (userProfile?.role === 'company_admin') return 'Company Administrator';
    return 'User';
  };

  return (
    <div className="p-4 border-t border-sidebar-border">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-accent-foreground font-medium">
          {getInitials()}
        </div>
        <div>
          <div className="text-sidebar-foreground font-medium">{getDisplayName()}</div>
          <div className="text-sidebar-foreground/70 text-sm">{getRoleDisplay()}</div>
        </div>
      </div>
    </div>
  );
};

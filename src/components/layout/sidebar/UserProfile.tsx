
interface UserProfileProps {
  isCollapsed: boolean;
}

export const UserProfile = ({ isCollapsed }: UserProfileProps) => {
  if (isCollapsed) return null;

  return (
    <div className="p-4 border-t border-sidebar-border">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-accent-foreground font-medium">
          UA
        </div>
        <div>
          <div className="text-sidebar-foreground font-medium">User Name</div>
          <div className="text-sidebar-foreground/70 text-sm">Administrator</div>
        </div>
      </div>
    </div>
  );
};

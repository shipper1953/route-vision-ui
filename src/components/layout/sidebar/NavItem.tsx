
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context";

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isCollapsed: boolean;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}

export const NavItem = ({ to, icon: Icon, label, isCollapsed, adminOnly = false, superAdminOnly = false }: NavItemProps) => {
  const location = useLocation();
  const { setIsCollapsed } = useSidebar();
  const { isAdmin, isSuperAdmin } = useAuth();
  const isActive = location.pathname === to;
  
  // Check permissions
  if (adminOnly && !isAdmin) return null;
  if (superAdminOnly && !isSuperAdmin) return null;

  const handleClick = () => {
    // Collapse sidebar when option is selected
    setIsCollapsed(true);
  };
  
  return (
    <NavLink 
      to={to} 
      onClick={handleClick}
      className={({ isActive }) => 
        cn(
          "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
          isCollapsed ? "justify-center" : "",
          isActive 
            ? "bg-sidebar-accent text-sidebar-accent-foreground" 
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
        )
      }
    >
      <Icon size={20} />
      {!isCollapsed && <span>{label}</span>}
    </NavLink>
  );
};

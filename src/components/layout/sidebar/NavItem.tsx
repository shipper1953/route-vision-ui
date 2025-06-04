
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
    <div className="relative group">
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
      
      {/* Tooltip for collapsed state */}
      {isCollapsed && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-md border shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </div>
  );
};

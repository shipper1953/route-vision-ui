
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context";
import { useState, useRef } from "react";

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
  const [isHovered, setIsHovered] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const isActive = location.pathname === to;
  
  // Check permissions
  if (adminOnly && !isAdmin) return null;
  if (superAdminOnly && !isSuperAdmin) return null;

  const handleClick = () => {
    // Don't expand sidebar when clicking on nav items while collapsed
    // Only the empty blue area should expand it
  };

  // Calculate tooltip position
  const getTooltipPosition = () => {
    if (!navRef.current) return {};
    const rect = navRef.current.getBoundingClientRect();
    return {
      left: rect.right + 8,
      top: rect.top + rect.height / 2,
      transform: 'translateY(-50%)'
    };
  };
  
  return (
    <div 
      ref={navRef}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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
      {isCollapsed && isHovered && (
        <div 
          className="fixed bg-gray-900 text-white px-3 py-2 rounded-md text-sm whitespace-nowrap pointer-events-none z-[9999] shadow-lg border border-gray-700"
          style={getTooltipPosition()}
        >
          {label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
        </div>
      )}
    </div>
  );
};

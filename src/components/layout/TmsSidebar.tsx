
import { useState } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { 
  ChevronLeft, 
  Home, 
  Package, 
  Truck, 
  Users, 
  Settings, 
  Menu,
  Plus 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../context/AuthContext";

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isCollapsed: boolean;
  adminOnly?: boolean;
}

// Consider adding ShipTornadoLogo component or use an SVG directly
const ShipTornadoLogo = ({ className, size = 24, spin = true }: { className?: string, size?: number, spin?: boolean }) => {
  return (
    <div className={cn("flex items-center", className)}>
      <svg 
        className={cn("mr-2", { "animate-spin-slow": spin })} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" 
          fill="currentColor"
        />
        <path 
          d="M12 6v12M6 12h12" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-bold">Ship Tornado</span>
    </div>
  );
};

const NavItem = ({ to, icon: Icon, label, isCollapsed, adminOnly = false }: NavItemProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const isActive = location.pathname === to;
  
  // Check if user has admin role
  const isAdmin = user?.roles?.some(role => ['Super Admin', 'Company Admin'].includes(role));
  
  if (adminOnly && !isAdmin) return null;
  
  return (
    <NavLink 
      to={to} 
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

export function TmsSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className={cn(
      "h-screen flex flex-col bg-sidebar fixed left-0 top-0 z-40 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-between p-4">
        {!isCollapsed ? (
          <ShipTornadoLogo className="text-sidebar-foreground" />
        ) : (
          <div className="mx-auto">
            <ShipTornadoLogo className="text-sidebar-foreground" size={20} spin={false} />
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-sidebar-foreground ml-auto hover:bg-sidebar-accent"
        >
          {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      <div className="flex-1 overflow-auto py-4 px-2 flex flex-col gap-1">
        <NavItem to="/dashboard" icon={Home} label="Dashboard" isCollapsed={isCollapsed} />
        <NavItem to="/orders" icon={Package} label="Orders" isCollapsed={isCollapsed} />
        <NavItem to="/shipments" icon={Truck} label="Shipments" isCollapsed={isCollapsed} />
        <NavItem to="/create-shipment" icon={Plus} label="Create Shipment" isCollapsed={isCollapsed} />
        <NavItem to="/admin/users" icon={Users} label="Users" isCollapsed={isCollapsed} adminOnly={true} />
        <NavItem to="/admin/create-user" icon={Plus} label="Create User" isCollapsed={isCollapsed} adminOnly={true} />
        <NavItem to="/settings" icon={Settings} label="Settings" isCollapsed={isCollapsed} />
      </div>
      
      {!isCollapsed && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-accent-foreground font-medium">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
            <div>
              <div className="text-sidebar-foreground font-medium">{user?.firstName} {user?.lastName}</div>
              <div className="text-sidebar-foreground/70 text-sm">{user?.roles?.[0] || 'User'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

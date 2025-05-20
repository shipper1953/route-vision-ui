
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
import { ShipTornadoLogo } from "@/components/logo/ShipTornadoLogo";
import { useSidebar } from "@/context/SidebarContext";

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isCollapsed: boolean;
  adminOnly?: boolean;
}

const NavItem = ({ to, icon: Icon, label, isCollapsed, adminOnly = false }: NavItemProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  // For demo purposes, let's assume the user is an admin
  const isAdmin = true;
  
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
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <div 
      className={cn(
        "h-screen flex flex-col bg-sidebar fixed left-0 top-0 z-40 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-4">
        {!isCollapsed ? (
          <ShipTornadoLogo className="text-white" />
        ) : (
          <div className="mx-auto">
            <ShipTornadoLogo className="text-white" size={20} spin={false} />
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar}
          className="text-sidebar-foreground ml-auto hover:bg-sidebar-accent"
        >
          {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      <div className="flex-1 overflow-auto py-4 px-2 flex flex-col gap-1">
        <NavItem to="/" icon={Home} label="Dashboard" isCollapsed={isCollapsed} />
        <NavItem to="/orders" icon={Package} label="Orders" isCollapsed={isCollapsed} />
        <NavItem to="/shipments" icon={Truck} label="Shipments" isCollapsed={isCollapsed} />
        <NavItem to="/create-shipment" icon={Plus} label="Create Shipment" isCollapsed={isCollapsed} />
        <NavItem to="/users" icon={Users} label="Users" isCollapsed={isCollapsed} adminOnly={true} />
        <NavItem to="/create-user" icon={Plus} label="Create User" isCollapsed={isCollapsed} adminOnly={true} />
        <NavItem to="/settings" icon={Settings} label="Settings" isCollapsed={isCollapsed} />
      </div>
      
      {!isCollapsed && (
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
      )}
    </div>
  );
}

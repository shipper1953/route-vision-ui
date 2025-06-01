
import { useLocation, NavLink } from "react-router-dom";
import { 
  Home, 
  Package, 
  Truck, 
  Users, 
  Settings, 
  Plus,
  LogOut,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ShipTornadoLogo } from "@/components/logo/ShipTornadoLogo";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isCollapsed: boolean;
  adminOnly?: boolean;
}

const NavItem = ({ to, icon: Icon, label, isCollapsed, adminOnly = false }: NavItemProps) => {
  const location = useLocation();
  const { setIsCollapsed } = useSidebar();
  const { isAdmin } = useAuth();
  const isActive = location.pathname === to;
  
  if (adminOnly && !isAdmin) return null;

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

const LogoutButton = ({ isCollapsed }: { isCollapsed: boolean }) => {
  const { logout, loading } = useAuth();
  const { setIsCollapsed } = useSidebar();

  const handleLogout = () => {
    setIsCollapsed(true);
    logout();
  };

  return (
    <button 
      onClick={handleLogout}
      disabled={loading}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md transition-colors w-full",
        isCollapsed ? "justify-center" : "",
        "text-sidebar-foreground/80 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
        loading && "opacity-50 cursor-not-allowed"
      )}
    >
      <LogOut size={20} />
      {!isCollapsed && <span>Logout</span>}
    </button>
  );
};

const CreateMenu = ({ isCollapsed }: { isCollapsed: boolean }) => {
  const { setIsCollapsed } = useSidebar();
  const { isAdmin } = useAuth();

  const handleMenuItemClick = () => {
    setIsCollapsed(true);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md transition-colors w-full",
            isCollapsed ? "justify-center" : "",
            "text-sidebar-foreground/80 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
          )}
        >
          <Plus size={20} />
          {!isCollapsed && <span>Create</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        side={isCollapsed ? "right" : "bottom"} 
        align={isCollapsed ? "start" : "center"}
        className="bg-popover border border-border w-48"
      >
        <DropdownMenuItem asChild>
          <NavLink to="/orders/new" onClick={handleMenuItemClick} className="flex items-center gap-2 cursor-pointer">
            <Package size={16} />
            <span>Create Order</span>
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <NavLink to="/shipments/new" onClick={handleMenuItemClick} className="flex items-center gap-2 cursor-pointer">
            <Truck size={16} />
            <span>Create Shipment</span>
          </NavLink>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <NavLink to="/users/new" onClick={handleMenuItemClick} className="flex items-center gap-2 cursor-pointer">
              <Users size={16} />
              <span>Create User</span>
            </NavLink>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export function TmsSidebar() {
  const { isCollapsed, toggleSidebar, sidebarRef } = useSidebar();

  // Handle click on open space when collapsed to expand
  const handleSidebarClick = (e: React.MouseEvent) => {
    if (isCollapsed && e.target === e.currentTarget) {
      toggleSidebar();
    }
  };

  return (
    <div 
      ref={sidebarRef}
      onClick={handleSidebarClick}
      className={cn(
        "h-screen flex flex-col bg-sidebar fixed left-0 top-0 z-40 transition-all duration-300 cursor-pointer",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-4">
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <ShipTornadoLogo className="text-white" size={32} />
            <span className="text-white font-semibold text-lg">Ship Tornado</span>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <ShipTornadoLogo className="text-white" size={28} spin={false} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto py-4 px-2 flex flex-col gap-1">
        <NavItem to="/" icon={Home} label="Dashboard" isCollapsed={isCollapsed} />
        <NavItem to="/orders" icon={Package} label="Orders" isCollapsed={isCollapsed} />
        <NavItem to="/shipments" icon={Truck} label="Shipments" isCollapsed={isCollapsed} />
        <CreateMenu isCollapsed={isCollapsed} />
        <NavItem to="/users" icon={Users} label="Users" isCollapsed={isCollapsed} adminOnly={true} />
        <NavItem to="/admin" icon={Shield} label="Admin Panel" isCollapsed={isCollapsed} adminOnly={true} />
        <NavItem to="/settings" icon={Settings} label="Settings" isCollapsed={isCollapsed} />
      </div>

      <div className="p-2">
        <LogoutButton isCollapsed={isCollapsed} />
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

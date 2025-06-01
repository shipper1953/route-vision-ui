
import { 
  Home, 
  Package, 
  Truck, 
  Users, 
  Settings, 
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ShipTornadoLogo } from "@/components/logo/ShipTornadoLogo";
import { useSidebar } from "@/context/SidebarContext";
import { NavItem } from "./sidebar/NavItem";
import { LogoutButton } from "./sidebar/LogoutButton";
import { CreateMenu } from "./sidebar/CreateMenu";
import { UserProfile } from "./sidebar/UserProfile";

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
      
      <UserProfile isCollapsed={isCollapsed} />
    </div>
  );
}

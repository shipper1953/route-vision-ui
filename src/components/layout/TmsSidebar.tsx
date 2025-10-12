
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NavItem } from "./sidebar/NavItem";
import { OrdersNavItem } from "./sidebar/OrdersNavItem";
import { ShipmentsNavItem } from "./sidebar/ShipmentsNavItem";
import { ItemMasterNavItem } from "./sidebar/ItemMasterNavItem";
import { TornadoPackNavItem } from "./sidebar/TornadoPackNavItem";
import { CompanyAdminNavItem } from "./sidebar/CompanyAdminNavItem";
import { UserProfile } from "./sidebar/UserProfile";
import { CreateMenu } from "./sidebar/CreateMenu";
import { LogoutButton } from "./sidebar/LogoutButton";
import { ShipTornadoLogo } from "@/components/logo/ShipTornadoLogo";
import { useSidebar } from "@/context/SidebarContext";
import { useLocation } from "react-router-dom";
import { 
  Home,
  Database,
  Truck,
  ShoppingCart,
  Users,
  Settings,
  BarChart3,
  Shield
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const TmsSidebar = () => {
  const { isCollapsed, toggleSidebar, sidebarRef } = useSidebar();
  const { userProfile } = useAuth();

  const isAdmin = userProfile?.role === 'company_admin';
  const isSuperAdmin = userProfile?.role === 'super_admin';

  const handleSidebarClick = () => {
    toggleSidebar();
  };

  return (
    <div
      ref={sidebarRef}
      className={cn(
        "fixed left-0 top-0 z-40 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col cursor-pointer",
        isCollapsed ? "w-16" : "w-64"
      )}
      onClick={handleSidebarClick}
    >
      {/* Header with Ship Tornado Logo */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-center">
        <div className="flex items-center gap-3">
          <ShipTornadoLogo 
            size={24} 
            className="text-sidebar-foreground flex-shrink-0" 
          />
          {!isCollapsed && (
            <span className="text-lg font-semibold text-sidebar-foreground">
              Ship Tornado
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-2">
          <NavItem icon={Home} label="Dashboard" to="/" isCollapsed={isCollapsed} />
          <OrdersNavItem />
          <ShipmentsNavItem />
          <ItemMasterNavItem />
          <TornadoPackNavItem />
          
          {(isAdmin || isSuperAdmin) && (
            <>
              <Separator className="my-4 bg-sidebar-border" />
              <div className="px-2 py-1">
                {!isCollapsed && <h3 className="text-xs font-semibold text-sidebar-primary uppercase tracking-wider">Admin</h3>}
              </div>
              <NavItem icon={Users} label="Users" to="/users" isCollapsed={isCollapsed} />
              {isAdmin && <CompanyAdminNavItem />}
              {isSuperAdmin && <NavItem icon={BarChart3} label="Super Admin" to="/super-admin" isCollapsed={isCollapsed} />}
            </>
          )}
          
          <Separator className="my-4 bg-sidebar-border" />
          <CreateMenu isCollapsed={isCollapsed} />
          <NavItem icon={Settings} label="Settings" to="/settings" isCollapsed={isCollapsed} />
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2">
        <UserProfile isCollapsed={isCollapsed} />
        <LogoutButton isCollapsed={isCollapsed} />
      </div>
    </div>
  );
};

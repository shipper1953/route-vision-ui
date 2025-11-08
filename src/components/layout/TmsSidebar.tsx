
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
import { WmsNavItem } from "./sidebar/WmsNavItem";
import { UserProfile } from "./sidebar/UserProfile";
import { CreateMenu } from "./sidebar/CreateMenu";
import { LogoutButton } from "./sidebar/LogoutButton";
import { ShipTornadoLogo } from "@/components/logo/ShipTornadoLogo";
import { useSidebar } from "@/context/SidebarContext";
import {
  Home,
  Database,
  Truck,
  ShoppingCart,
  Users,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const TmsSidebar = () => {
  const { isCollapsed, toggleSidebar, sidebarRef } = useSidebar();
  const { userProfile } = useAuth();

  const isAdmin = userProfile?.role === 'company_admin';
  const isSuperAdmin = userProfile?.role === 'super_admin';

  return (
    <div
      ref={sidebarRef}
      className={cn(
        "fixed left-0 top-0 z-40 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header with Ship Tornado Logo */}
      <div className="relative p-4 border-b border-sidebar-border flex items-center justify-center">
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground"
              onClick={(event) => {
                event.stopPropagation();
                toggleSidebar();
              }}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {isCollapsed ? "Expand" : "Collapse"}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-2">
          <NavItem icon={Home} label="Dashboard" to="/" isCollapsed={isCollapsed} />
          <OrdersNavItem />
          <ShipmentsNavItem />
          <ItemMasterNavItem />
          <TornadoPackNavItem />
          
          <Separator className="my-4 bg-sidebar-border" />
          <WmsNavItem isCollapsed={isCollapsed} />
          
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

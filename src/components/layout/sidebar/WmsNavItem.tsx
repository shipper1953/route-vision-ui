import { useState, useEffect, useRef } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { ChevronDown, Package, ClipboardCheck, Warehouse, ListChecks, BarChart3, Users, FileText, MapPin, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavItem } from "./NavItem";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/context/SidebarContext";

interface WmsNavItemProps {
  isCollapsed?: boolean;
}

export const WmsNavItem = ({ isCollapsed }: WmsNavItemProps) => {
  const location = useLocation();
  const { userProfile } = useAuth();
  const { setIsCollapsed } = useSidebar();
  const [isOpen, setIsOpen] = useState(location.pathname.startsWith('/wms'));
  const [isHovered, setIsHovered] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Keep WMS menu expanded when on WMS pages
  useEffect(() => {
    if (location.pathname.startsWith('/wms')) {
      setIsOpen(true);
    }
  }, [location.pathname]);

  // Check if user has any WMS modules enabled
  const wmsModules = userProfile?.company_id ? {} : {}; // TODO: fetch from company settings
  
  const hasReceiving = true; // TODO: check wmsModules.receiving
  const hasQuality = true; // TODO: check wmsModules.quality
  const hasInventory = true; // TODO: check wmsModules.inventory
  const hasPicking = true; // TODO: check wmsModules.picking
  const hasReporting = true; // TODO: check wmsModules.reporting

  const hasAnyWmsModule = hasReceiving || hasQuality || hasInventory || hasPicking || hasReporting;

  if (!hasAnyWmsModule) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCollapsed(true);
  };

  const getTooltipPosition = () => {
    if (!navRef.current) return {};
    const rect = navRef.current.getBoundingClientRect();
    return {
      left: rect.right + 8,
      top: rect.top,
    };
  };

  const wmsSubmenuItems = [
    { label: "Dashboard", to: "/wms/dashboard" },
    { label: "Customers", to: "/wms/customers" },
    { label: "Purchase Orders", to: "/wms/purchase-orders" },
    ...(hasReceiving ? [{ label: "Receiving", to: "/wms/receiving" }] : []),
    ...(hasQuality ? [{ label: "Quality", to: "/wms/quality" }] : []),
    ...(hasInventory ? [{ label: "Inventory", to: "/wms/inventory" }] : []),
    ...(hasPicking ? [{ label: "Picking", to: "/wms/picking" }, { label: "Pick Waves", to: "/wms/pick-waves" }] : []),
    ...(hasInventory ? [{ label: "Locations", to: "/wms/locations" }] : []),
    ...(hasReporting ? [{ label: "Reports", to: "/wms/reporting" }] : []),
  ];

  if (isCollapsed) {
    return (
      <div
        ref={navRef}
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={cn(
            "flex items-center justify-center px-3 py-2 rounded-md transition-colors cursor-pointer",
            location.pathname.startsWith('/wms')
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/80"
          )}
        >
          <Warehouse size={20} />
        </div>

        {isHovered && (
          <div
            className="fixed bg-gray-900 text-white rounded-md shadow-lg border border-gray-700 z-[9999] min-w-[160px]"
            style={getTooltipPosition()}
          >
            <div className="py-1">
              {wmsSubmenuItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={handleClick}
                  className={({ isActive }) =>
                    cn(
                      "block px-4 py-2 text-sm hover:bg-gray-800 transition-colors",
                      isActive && "bg-gray-800"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
            <div className="absolute right-full top-4 border-4 border-transparent border-r-gray-900"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer hover:bg-sidebar-accent group",
          location.pathname.startsWith('/wms') && "bg-sidebar-accent"
        )}>
          <Warehouse className="h-5 w-5 flex-shrink-0 text-sidebar-foreground" />
          <span className="flex-1 text-left text-sm font-medium text-sidebar-foreground">WMS</span>
          <ChevronDown className={cn(
            "h-4 w-4 text-sidebar-foreground transition-transform",
            isOpen && "rotate-180"
          )} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-4 mt-1 space-y-1 border-l-2 border-sidebar-border pl-2">
        <NavItem 
          icon={Warehouse} 
          label="Dashboard" 
          to="/wms/dashboard" 
          isCollapsed={false}
        />
        <NavItem 
          icon={Users} 
          label="Customers" 
          to="/wms/customers" 
          isCollapsed={false}
        />
        <NavItem 
          icon={FileText} 
          label="Purchase Orders" 
          to="/wms/purchase-orders" 
          isCollapsed={false}
        />
        {hasReceiving && (
          <NavItem 
            icon={Package} 
            label="Receiving" 
            to="/wms/receiving" 
            isCollapsed={false}
          />
        )}
        {hasQuality && (
          <NavItem 
            icon={ClipboardCheck} 
            label="Quality" 
            to="/wms/quality" 
            isCollapsed={false}
          />
        )}
        {hasInventory && (
          <NavItem 
            icon={Warehouse} 
            label="Inventory" 
            to="/wms/inventory" 
            isCollapsed={false}
          />
        )}
        {hasPicking && (
          <>
            <NavItem 
              icon={ListChecks} 
              label="Picking" 
              to="/wms/picking" 
              isCollapsed={false}
            />
            <NavItem 
              icon={Layers} 
              label="Pick Waves" 
              to="/wms/pick-waves" 
              isCollapsed={false}
            />
          </>
        )}
        {hasInventory && (
          <NavItem 
            icon={MapPin} 
            label="Locations" 
            to="/wms/locations" 
            isCollapsed={false}
          />
        )}
        {hasReporting && (
          <NavItem 
            icon={BarChart3} 
            label="Reports" 
            to="/wms/reporting" 
            isCollapsed={false}
          />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

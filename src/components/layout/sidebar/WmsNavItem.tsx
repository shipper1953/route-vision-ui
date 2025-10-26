import { useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, Package, ClipboardCheck, Warehouse, ListChecks, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavItem } from "./NavItem";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";

interface WmsNavItemProps {
  isCollapsed?: boolean;
}

export const WmsNavItem = ({ isCollapsed }: WmsNavItemProps) => {
  const location = useLocation();
  const { userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(location.pathname.startsWith('/wms'));

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

  if (isCollapsed) {
    return <NavItem icon={Warehouse} label="WMS" to="/wms/dashboard" isCollapsed={isCollapsed} />;
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
          <NavItem 
            icon={ListChecks} 
            label="Picking" 
            to="/wms/picking" 
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

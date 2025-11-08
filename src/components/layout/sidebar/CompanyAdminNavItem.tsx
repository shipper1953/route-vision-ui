import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";
import { useState, useRef, useEffect } from "react";
import { Shield, ChevronDown, Building2, Users, Package, Truck, Warehouse, Wallet, Plug } from "lucide-react";
import { NavItem } from "./NavItem";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export const CompanyAdminNavItem = () => {
  const location = useLocation();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(location.pathname.startsWith('/company-admin'));
  const navRef = useRef<HTMLDivElement>(null);
  const isActive = location.pathname.startsWith('/company-admin');

  // Keep menu expanded when on Company Admin pages
  useEffect(() => {
    if (location.pathname.startsWith('/company-admin')) {
      setIsOpen(true);
    }
  }, [location.pathname]);

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

  const submenuItems = [
    { icon: Building2, label: "Company Profile", to: "/company-admin?tab=profile" },
    { icon: Users, label: "User Management", to: "/company-admin?tab=users" },
    { icon: Package, label: "Company Orders", to: "/company-admin?tab=orders" },
    { icon: Truck, label: "Company Shipments", to: "/company-admin?tab=shipments" },
    { icon: Warehouse, label: "Warehouses", to: "/company-admin?tab=warehouses" },
    { icon: Wallet, label: "Wallet & Billing", to: "/company-admin?tab=wallet" },
    { icon: Plug, label: "Integrations", to: "/company-admin?tab=integrations" }
  ];

  return (
    <div
      ref={navRef}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isCollapsed ? (
        <>
          <div
            className={cn(
              "flex items-center justify-center px-3 py-2 rounded-md transition-colors cursor-pointer",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
            )}
          >
            <Shield size={20} />
          </div>

          {isHovered && (
            <div
              className="fixed bg-gray-900 text-white rounded-md shadow-lg border border-gray-700 z-[9999] min-w-[180px]"
              style={getTooltipPosition()}
            >
              <div className="py-1">
                {submenuItems.map((item) => (
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
        </>
      ) : (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="w-full" onClick={(e) => e.stopPropagation()}>
            <div className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer hover:bg-sidebar-accent group",
              isActive && "bg-sidebar-accent"
            )}>
              <Shield className="h-5 w-5 flex-shrink-0 text-sidebar-foreground" />
              <span className="flex-1 text-left text-sm font-medium text-sidebar-foreground">
                Company Admin
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 text-sidebar-foreground transition-transform duration-300 ease-out",
                isOpen && "rotate-180"
              )} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="ml-4 mt-1 space-y-1 border-l-2 border-sidebar-border pl-2 animate-accordion-down data-[state=closed]:animate-accordion-up">
            {submenuItems.map(item => (
              <NavItem 
                key={item.to}
                icon={item.icon} 
                label={item.label} 
                to={item.to} 
                isCollapsed={false}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

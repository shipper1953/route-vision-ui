import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";
import { useState, useRef, useEffect } from "react";
import { ShoppingCart, ChevronDown, Package, PackagePlus, Boxes } from "lucide-react";
import { NavItem } from "./NavItem";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export const OrdersNavItem = () => {
  const location = useLocation();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(location.pathname.startsWith('/orders'));
  const navRef = useRef<HTMLDivElement>(null);
  const isActive = location.pathname.startsWith('/orders');

  // Keep menu expanded when on Orders pages
  useEffect(() => {
    if (location.pathname.startsWith('/orders')) {
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
    { icon: Package, label: "Single Orders", to: "/orders" },
    { icon: Boxes, label: "Bulk Ship", to: "/orders/bulk-ship" },
    { icon: PackagePlus, label: "Create Order", to: "/orders/create" }
  ];

  return (
    <div
      ref={navRef}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isCollapsed ? (
        // Collapsed state - show icon with tooltip submenu
        <>
          <div
            className={cn(
              "flex items-center justify-center px-3 py-2 rounded-md transition-colors cursor-pointer",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
            )}
          >
            <ShoppingCart size={20} />
          </div>

          {isHovered && (
            <div
              className="fixed bg-gray-900 text-white rounded-md shadow-lg border border-gray-700 z-[9999] min-w-[160px]"
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
              <ShoppingCart className="h-5 w-5 flex-shrink-0 text-sidebar-foreground" />
              <span className="flex-1 text-left text-sm font-medium text-sidebar-foreground">
                Orders
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 text-sidebar-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="ml-4 mt-1 space-y-1 border-l-2 border-sidebar-border pl-2">
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

import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";
import { useState, useRef } from "react";
import { Database, ChevronRight } from "lucide-react";

export const ItemMasterNavItem = () => {
  const location = useLocation();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [isHovered, setIsHovered] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const isActive = location.pathname.startsWith('/item-master');

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
    { label: "Create Item", path: "/item-master/create" },
    { label: "Items", path: "/item-master" }
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
            <Database size={20} />
          </div>

          {isHovered && (
            <div
              className="fixed bg-gray-900 text-white rounded-md shadow-lg border border-gray-700 z-[9999] min-w-[160px]"
              style={getTooltipPosition()}
            >
              <div className="py-1">
                {submenuItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
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
        <>
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
            )}
          >
            <Database size={20} />
            <span className="flex-1">Item Master</span>
            <ChevronRight size={16} className="text-sidebar-foreground/60" />
          </div>

          {isHovered && (
            <div
              className="fixed bg-gray-900 text-white rounded-md shadow-lg border border-gray-700 z-[9999] min-w-[160px]"
              style={getTooltipPosition()}
            >
              <div className="py-1">
                {submenuItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
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
      )}
    </div>
  );
};

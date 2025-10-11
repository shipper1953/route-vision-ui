
import { NavLink } from "react-router-dom";
import { Package, Plus, Truck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CreateMenuProps {
  isCollapsed: boolean;
}

export const CreateMenu = ({ isCollapsed }: CreateMenuProps) => {
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
          <NavLink to="/orders/create" onClick={handleMenuItemClick} className="flex items-center gap-2 cursor-pointer">
            <Package size={16} />
            <span>Create Order</span>
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <NavLink to="/shipments/create" onClick={handleMenuItemClick} className="flex items-center gap-2 cursor-pointer">
            <Truck size={16} />
            <span>Create Shipment</span>
          </NavLink>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <NavLink to="/users/create" onClick={handleMenuItemClick} className="flex items-center gap-2 cursor-pointer">
              <Users size={16} />
              <span>Create User</span>
            </NavLink>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

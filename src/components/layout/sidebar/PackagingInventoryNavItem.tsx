
import { Box } from "lucide-react";
import { NavItem } from "./NavItem";
import { useSidebar } from "@/context/SidebarContext";

export const PackagingInventoryNavItem = () => {
  const { isCollapsed } = useSidebar();
  
  return (
    <NavItem
      icon={Box}
      label="Tornado Pack"
      to="/packaging?tab=box-recommendations"
      isCollapsed={isCollapsed}
    />
  );
};

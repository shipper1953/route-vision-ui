
import { Package } from "lucide-react";
import { NavItem } from "./NavItem";
import { useSidebar } from "@/context/SidebarContext";

export const PackagingInventoryNavItem = () => {
  const { isCollapsed } = useSidebar();
  
  return (
    <NavItem
      icon={Package}
      label="Packaging Inventory"
      to="/settings?tab=packaging"
      isCollapsed={isCollapsed}
    />
  );
};

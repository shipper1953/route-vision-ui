
import { Package } from "lucide-react";
import { NavItem } from "./NavItem";

export const PackagingInventoryNavItem = () => {
  return (
    <NavItem
      icon={Package}
      label="Packaging Inventory"
      to="/settings?tab=cartonization"
      end={false}
    />
  );
};

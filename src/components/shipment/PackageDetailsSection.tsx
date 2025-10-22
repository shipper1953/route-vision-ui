
import { PackageManagementSection } from "./package/PackageManagementSection";

interface PackageDetailsSectionProps {
  orderItems?: any[];
  selectedItems?: any[];
  onItemsSelected?: (items: any[]) => void;
  itemsAlreadyShipped?: Array<{ itemId: string; quantityShipped: number }>;
  orderId?: string;
}

export const PackageDetailsSection = ({ 
  orderItems = [],
  selectedItems = [],
  onItemsSelected,
  itemsAlreadyShipped = [],
  orderId
}: PackageDetailsSectionProps) => {
  return (
    <div className="space-y-6">
      {/* Package Management Section with integrated item selection */}
      <PackageManagementSection 
        orderItems={orderItems}
        selectedItems={selectedItems}
        onItemsSelected={onItemsSelected}
        itemsAlreadyShipped={itemsAlreadyShipped}
        orderId={orderId}
      />
    </div>
  );
};

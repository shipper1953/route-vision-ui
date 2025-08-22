
import { useEffect } from "react";
import { OrderItemsBox } from "./package/OrderItemsBox";
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";
import { PackageManagementSection } from "./package/PackageManagementSection";

interface PackageDetailsSectionProps {
  orderItems?: any[];
}

export const PackageDetailsSection = ({ orderItems = [] }: PackageDetailsSectionProps) => {
  return (
    <div className="space-y-6">
      {/* Order Items Box */}
      {orderItems.length > 0 && (
        <OrderItemsBox 
          orderItems={orderItems} 
          onItemsScanned={() => {}} // Scanning is now handled within PackageManagementSection
        />
      )}

      {/* New Package Management Section */}
      <PackageManagementSection orderItems={orderItems} />
    </div>
  );
};

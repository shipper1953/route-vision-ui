
import { OrderItemsBox } from "./package/OrderItemsBox";
import { CartonizationDialog } from "@/components/cartonization/CartonizationDialog";
import { useRecommendedBox } from "./package/hooks/useRecommendedBox";
import { usePackagingOptimization } from "./package/hooks/usePackagingOptimization";
import { RecommendedBoxCard } from "./package/RecommendedBoxCard";
import { PackageDetailsCard } from "./package/PackageDetailsCard";
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";

interface PackageDetailsSectionProps {
  orderItems?: any[];
}

export const PackageDetailsSection = ({ orderItems = [] }: PackageDetailsSectionProps) => {
  const form = useFormContext<ShipmentForm>();
  const orderId = form.getValues("orderId");
  
  const { recommendedBox, boxUtilization, cartonizationResult } = useRecommendedBox(orderItems);
  
  const {
    showCartonization,
    setShowCartonization,
    handleOptimizePackaging,
    handleSelectBox,
    handleItemsScanned,
    buildCartonizationItems,
    boxes
  } = usePackagingOptimization(orderItems);

  const handleUseRecommendedBox = (box: any) => {
    handleSelectBox(box);
  };
  
  return (
    <div className="space-y-6">
      {/* Order Items Box */}
      {orderItems.length > 0 && (
        <OrderItemsBox 
          orderItems={orderItems} 
          onItemsScanned={handleItemsScanned}
        />
      )}

      {/* Enhanced Recommended Box Display */}
      {recommendedBox && cartonizationResult && (
        <RecommendedBoxCard
          recommendedBox={recommendedBox}
          cartonizationResult={cartonizationResult}
          boxUtilization={boxUtilization}
          onUseRecommendedBox={handleUseRecommendedBox}
        />
      )}

      {/* Package Details Card */}
      <PackageDetailsCard
        orderItemsCount={orderItems.length}
        orderId={orderId}
        onOptimizePackaging={handleOptimizePackaging}
      />

      {/* Cartonization Dialog */}
      <CartonizationDialog
        isOpen={showCartonization}
        onClose={() => setShowCartonization(false)}
        items={buildCartonizationItems()}
        availableBoxes={boxes}
        onSelectBox={handleSelectBox}
      />
    </div>
  );
};

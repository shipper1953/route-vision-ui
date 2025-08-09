
import { useEffect, useState } from "react";
import { OrderItemsBox } from "./package/OrderItemsBox";
import { CartonizationDialog } from "@/components/cartonization/CartonizationDialog";
import { useRecommendedBox } from "./package/hooks/useRecommendedBox";
import { usePackagingOptimization } from "./package/hooks/usePackagingOptimization";
import { RecommendedBoxCard } from "./package/RecommendedBoxCard";
import { PackageDetailsCard } from "./package/PackageDetailsCard";
import { BoxSelector } from "./package/BoxSelector";
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";
import { MultiPackageDisplay } from "@/components/cartonization/MultiPackageDisplay";
import { useMultiPackageCartonization } from "@/hooks/useMultiPackageCartonization";
import { useCartonization } from "@/hooks/useCartonization";
import { useItemMaster } from "@/hooks/useItemMaster";
import { EditPackageDialog } from "@/components/cartonization/dialogs/EditPackageDialog";

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
    boxes,
    selectedBox
  } = usePackagingOptimization(orderItems);

  // Multi-package management
  const { createItemsFromOrderData } = useCartonization();
  const { items: masterItems } = useItemMaster();
  const {
    multiPackageResult,
    selectedPackageIndex,
    setSelectedPackageIndex,
    addManualPackage,
    editPackage,
    calculateMultiPackage,
  } = useMultiPackageCartonization();

  const [editOpen, setEditOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (orderItems && orderItems.length > 0) {
      const items = createItemsFromOrderData(orderItems, masterItems);
      if (items.length > 0) {
        calculateMultiPackage(items, 'balanced');
      }
    }
  }, [orderItems, masterItems, createItemsFromOrderData, calculateMultiPackage]);

  // Expose multi-package parcels to the form so the purchase step can buy multiple labels
  useEffect(() => {
    if (multiPackageResult) {
      try {
        const parcels = multiPackageResult.packages.map((pkg) => ({
          length: pkg.box.length,
          width: pkg.box.width,
          height: pkg.box.height,
          weight: Math.max(1, Math.round((pkg as any).packageWeight || 1)),
        }));
        (form as any).setValue('multiParcels', parcels);
        // Persist for cross-step access (in case RHF state resets when navigating steps)
        try {
          localStorage.setItem('multiParcels', JSON.stringify(parcels));
        } catch {}
        console.log('Stored multiParcels in form and localStorage:', parcels);
      } catch (e) {
        console.warn('Failed to prepare multiParcels:', e);
      }
    }
  }, [multiPackageResult]);

  const handleUseRecommendedBox = (box: any) => {
    handleSelectBox(box);
  };

  const handleEditPackage = (idx: number) => {
    setEditingIndex(idx);
    setEditOpen(true);
  };

  const handleSavePackageItems = (updatedItems: any[]) => {
    if (editingIndex !== null) {
      editPackage(editingIndex, { assignedItems: updatedItems });
    }
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

      {/* BIG AI PACKAGING RECOMMENDATIONS SECTION */}
      {recommendedBox && cartonizationResult ? (
        <div className="relative">
          {/* Prominent AI Recommendations Header */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-lg p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-2 rounded-lg">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-blue-900">🤖 AI PACKAGING RECOMMENDATIONS</h2>
                  <p className="text-blue-700">Smart box selection powered by advanced cartonization AI</p>
                </div>
              </div>
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                {cartonizationResult.confidence}% Confidence
              </div>
            </div>
            
            {/* Enhanced Recommended Box Display */}
            <RecommendedBoxCard
              recommendedBox={recommendedBox}
              cartonizationResult={cartonizationResult}
              boxUtilization={boxUtilization}
              onUseRecommendedBox={handleUseRecommendedBox}
            />
          </div>
        </div>
      ) : orderItems.length > 0 ? (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-yellow-500 text-white p-2 rounded-lg">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">🤖 AI Analyzing Your Order...</h3>
              <p className="text-yellow-700">Processing {orderItems.length} items for optimal packaging recommendations</p>
            </div>
          </div>
          <button
            onClick={handleOptimizePackaging}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Generate AI Recommendations
          </button>
        </div>
      ) : (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="bg-gray-400 text-white p-2 rounded-lg">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 9l3-3 3 3" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-600">📦 AI Package Recommendations</h3>
              <p className="text-gray-500">Load an order or enter package details to get AI-powered box recommendations</p>
            </div>
          </div>
        </div>
      )}

      {multiPackageResult && (
        <>
          <MultiPackageDisplay
            multiPackageResult={multiPackageResult}
            onAddPackage={addManualPackage}
            onEditPackage={handleEditPackage}
            onPackageSelect={setSelectedPackageIndex}
            selectedPackageIndex={selectedPackageIndex}
          />

          {editingIndex !== null && multiPackageResult && (
            <EditPackageDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              packageIndex={editingIndex}
              pkg={multiPackageResult.packages[editingIndex]}
              multiPackageResult={multiPackageResult}
              onSave={handleSavePackageItems}
            />
          )}
        </>
      )}

      {/* Package Details Card */}
      <PackageDetailsCard
        orderItemsCount={orderItems.length}
        orderId={orderId}
        onOptimizePackaging={handleOptimizePackaging}
      />

      {/* Box Selector */}
      <BoxSelector
        onSelectBox={handleSelectBox}
        selectedBox={selectedBox || recommendedBox}
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

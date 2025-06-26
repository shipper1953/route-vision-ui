
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DimensionsSection } from "./package/DimensionsSection";
import { WeightSection } from "./package/WeightSection";
import { QboidStatusNotification } from "./package/QboidStatusNotification";
import { QboidDimensionsSync } from "./package/QboidDimensionsSync";
import { OrderItemsBox } from "./package/OrderItemsBox";
import { RecommendedBoxDisplay } from "./package/RecommendedBoxDisplay";
import { CartonizationDialog } from "@/components/cartonization/CartonizationDialog";
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";
import { useCartonization } from "@/hooks/useCartonization";
import { useItemMaster } from "@/hooks/useItemMaster";
import { useState, useEffect } from "react";
import { Package, Calculator } from "lucide-react";
import { toast } from "sonner";
import { CartonizationEngine, CartonizationResult } from "@/services/cartonization/cartonizationEngine";

interface PackageDetailsSectionProps {
  orderItems?: any[];
}

export const PackageDetailsSection = ({ orderItems = [] }: PackageDetailsSectionProps) => {
  const form = useFormContext<ShipmentForm>();
  const orderId = form.getValues("orderId");
  const [showCartonization, setShowCartonization] = useState(false);
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [recommendedBox, setRecommendedBox] = useState<any>(null);
  const [boxUtilization, setBoxUtilization] = useState<number>(0);
  const { boxes, createItemsFromOrderData } = useCartonization();
  const { items: masterItems } = useItemMaster();

  // Calculate recommended box when order items are available
  useEffect(() => {
    if (orderItems && orderItems.length > 0 && masterItems.length > 0) {
      console.log("Calculating recommended box for order items:", orderItems);
      
      const items = createItemsFromOrderData(orderItems, masterItems);
      if (items.length > 0) {
        const engine = new CartonizationEngine(boxes);
        const result = engine.calculateOptimalBox(items);
        
        if (result) {
          console.log("Recommended box calculated:", result);
          setRecommendedBox(result.recommendedBox);
          setBoxUtilization(result.utilization);
          
          // Auto-populate form with recommended box dimensions
          form.setValue("length", result.recommendedBox.length);
          form.setValue("width", result.recommendedBox.width);
          form.setValue("height", result.recommendedBox.height);
          
          // Calculate total weight from items
          const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
          form.setValue("weight", totalWeight);
          
          toast.success(`Recommended box: ${result.recommendedBox.name}`);
        }
      }
    }
  }, [orderItems, masterItems, boxes, createItemsFromOrderData, form]);
  
  const handleOptimizePackaging = () => {
    console.log("Optimize packaging clicked");
    console.log("Order items from props:", orderItems);
    console.log("Scanned items:", scannedItems);
    console.log("Master items:", masterItems);
    
    let items: any[] = [];
    
    // Use scanned items if available, otherwise use all order items
    const itemsToUse = scannedItems.length > 0 ? scannedItems : orderItems;
    
    if (itemsToUse && itemsToUse.length > 0) {
      // Convert order items to cartonization items using Item Master data
      items = createItemsFromOrderData(itemsToUse, masterItems);
    }
    
    // If no order items, fall back to form dimensions
    if (items.length === 0) {
      const formData = form.getValues();
      
      if (formData.length && formData.width && formData.height && formData.weight) {
        console.log("Using form dimensions for cartonization");
        items = [{
          id: '1',
          name: 'Shipment Item',
          length: formData.length,
          width: formData.width,
          height: formData.height,
          weight: formData.weight,
          quantity: 1
        }];
      }
    }

    console.log("Items for cartonization:", items);

    if (items.length === 0) {
      toast.error('No items found for packaging optimization. Please ensure the order has items with dimensions, or enter package dimensions manually.');
      return;
    }

    setShowCartonization(true);
  };

  const handleSelectBox = (box: any) => {
    // Update form with selected box dimensions
    form.setValue("length", box.length);
    form.setValue("width", box.width);
    form.setValue("height", box.height);
    
    toast.success(`Selected ${box.name} for optimal packaging`);
  };

  const handleUseRecommendedBox = (box: any) => {
    handleSelectBox(box);
  };

  const handleItemsScanned = (items: any[]) => {
    console.log("Items scanned:", items);
    setScannedItems(items);
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

      {/* Recommended Box Display */}
      {recommendedBox && (
        <RecommendedBoxDisplay
          recommendedBox={recommendedBox}
          utilization={boxUtilization}
          onUseBox={handleUseRecommendedBox}
        />
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Package Details</CardTitle>
              <CardDescription>Enter the package dimensions and weight</CardDescription>
              {orderItems.length > 0 && (
                <p className="text-sm text-green-600 mt-1">
                  {orderItems.length} items loaded from order for packaging optimization
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleOptimizePackaging}
                className="flex items-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                Optimize Packaging
              </Button>
              <QboidDimensionsSync orderId={orderId} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <QboidStatusNotification />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <DimensionsSection />
            <WeightSection />
          </div>
        </CardContent>
      </Card>

      <CartonizationDialog
        isOpen={showCartonization}
        onClose={() => setShowCartonization(false)}
        items={(() => {
          // Build items for the dialog when it opens
          const itemsToUse = scannedItems.length > 0 ? scannedItems : orderItems;
          
          if (itemsToUse && itemsToUse.length > 0) {
            return createItemsFromOrderData(itemsToUse, masterItems);
          }
          
          // Fallback to form data
          const formData = form.getValues();
          if (formData.length && formData.width && formData.height && formData.weight) {
            return [{
              id: '1',
              name: 'Shipment Item',
              length: formData.length,
              width: formData.width,
              height: formData.height,
              weight: formData.weight,
              quantity: 1
            }];
          }
          
          return [];
        })()}
        availableBoxes={boxes}
        onSelectBox={handleSelectBox}
      />
    </div>
  );
};

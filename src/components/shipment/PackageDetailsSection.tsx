
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useState, useEffect, useRef } from "react";
import { Package, Calculator, CheckCircle } from "lucide-react";
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
  const [cartonizationResult, setCartonizationResult] = useState<CartonizationResult | null>(null);
  const { boxes, parameters, createItemsFromOrderData } = useCartonization();
  const { items: masterItems } = useItemMaster();
  
  // Use ref to track if we've already calculated for these items
  const calculatedItemsRef = useRef<string>('');
  const hasSetFormValuesRef = useRef(false);

  // Calculate recommended box when order items are available
  useEffect(() => {
    if (orderItems && orderItems.length > 0 && masterItems.length > 0) {
      // Create a unique key for the current items to prevent recalculation
      const itemsKey = JSON.stringify(orderItems.map(item => item.itemId).sort());
      
      // Only calculate if we haven't already calculated for these exact items
      if (calculatedItemsRef.current === itemsKey) {
        return;
      }
      
      console.log("Calculating recommended box for order items:", orderItems);
      
      try {
        const items = createItemsFromOrderData(orderItems, masterItems);
        if (items.length > 0) {
          const engine = new CartonizationEngine(boxes, parameters);
          const result = engine.calculateOptimalBox(items);
          
          if (result) {
            console.log("Recommended box calculated:", result);
            setRecommendedBox(result.recommendedBox);
            setBoxUtilization(result.utilization);
            setCartonizationResult(result);
            
            // Only auto-populate form once to prevent infinite loop
            if (!hasSetFormValuesRef.current) {
              form.setValue("length", result.recommendedBox.length);
              form.setValue("width", result.recommendedBox.width);
              form.setValue("height", result.recommendedBox.height);
              
              // Calculate total weight from items
              const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
              form.setValue("weight", totalWeight);
              
              hasSetFormValuesRef.current = true;
              toast.success(`Recommended ${result.recommendedBox.name} with ${result.confidence}% confidence`);
            }
            
            // Mark these items as calculated
            calculatedItemsRef.current = itemsKey;
          }
        }
      } catch (error) {
        console.error("Error calculating recommended box:", error);
      }
    }
  }, [orderItems, masterItems, boxes, parameters, createItemsFromOrderData, form]);

  // Reset when orderItems change significantly
  useEffect(() => {
    const itemsKey = JSON.stringify(orderItems.map(item => item.itemId).sort());
    if (calculatedItemsRef.current !== itemsKey) {
      hasSetFormValuesRef.current = false;
    }
  }, [orderItems]);
  
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

      {/* Enhanced Recommended Box Display */}
      {recommendedBox && cartonizationResult && (
        <Card className="border-green-200 bg-green-50 mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              AI Recommended Package
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-lg">{recommendedBox.name}</h4>
                <p className="text-muted-foreground">
                  Dimensions: {recommendedBox.length}" × {recommendedBox.width}" × {recommendedBox.height}"
                </p>
                <p className="text-muted-foreground">
                  Max Weight: {recommendedBox.maxWeight} lbs
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">
                    {recommendedBox.type.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge variant="outline">
                    {recommendedBox.inStock} in stock
                  </Badge>
                  <Badge variant="default">
                    {cartonizationResult.confidence}% confidence
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Space Utilization:</span>
                  <span className={`font-semibold ${boxUtilization > 95 ? 'text-red-600' : boxUtilization > 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {boxUtilization.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Dimensional Weight:</span>
                  <span className="font-semibold">{cartonizationResult.dimensionalWeight.toFixed(1)} lbs</span>
                </div>
                <div className="flex justify-between">
                  <span>Cost:</span>
                  <span className="font-semibold">${recommendedBox.cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Potential Savings:</span>
                  <span className="font-semibold text-green-600">${cartonizationResult.savings.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <h5 className="font-medium mb-2">Rules Applied:</h5>
              <div className="flex flex-wrap gap-1">
                {cartonizationResult.rulesApplied.map((rule, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {rule}
                  </Badge>
                ))}
              </div>
            </div>

            <Button 
              onClick={() => handleUseRecommendedBox(recommendedBox)}
              className="w-full mt-4"
              variant="default"
            >
              Use This Package
            </Button>
          </CardContent>
        </Card>
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

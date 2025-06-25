
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
import { CartonizationDialog } from "@/components/cartonization/CartonizationDialog";
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";
import { useCartonization } from "@/hooks/useCartonization";
import { useItemMaster } from "@/hooks/useItemMaster";
import { useState, useEffect } from "react";
import { Package, Calculator } from "lucide-react";
import { toast } from "sonner";
import { fetchOrderById } from "@/services/orderFetchService";

export const PackageDetailsSection = () => {
  const form = useFormContext<ShipmentForm>();
  const orderId = form.getValues("orderId");
  const [showCartonization, setShowCartonization] = useState(false);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const { boxes, createItemsFromOrderData } = useCartonization();
  const { items: masterItems } = useItemMaster();
  
  // Load order items when component mounts or orderId changes
  useEffect(() => {
    const loadOrderItems = async () => {
      if (orderId) {
        try {
          console.log("Loading order items for cartonization:", orderId);
          const orderData = await fetchOrderById(orderId);
          if (orderData && orderData.items && Array.isArray(orderData.items)) {
            console.log("Order items loaded:", orderData.items);
            setOrderItems(orderData.items);
          } else {
            console.log("No items found or items is not an array:", orderData?.items);
            setOrderItems([]);
          }
        } catch (error) {
          console.error("Error loading order items:", error);
          setOrderItems([]);
        }
      } else {
        setOrderItems([]);
      }
    };
    
    loadOrderItems();
  }, [orderId]);
  
  const handleOptimizePackaging = () => {
    console.log("Optimize packaging clicked");
    console.log("Order items:", orderItems);
    console.log("Master items:", masterItems);
    
    let items: any[] = [];
    
    if (orderItems && orderItems.length > 0) {
      // Convert order items to cartonization items using Item Master data
      items = createItemsFromOrderData(orderItems, masterItems);
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
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Package Details</CardTitle>
            <CardDescription>Enter the package dimensions and weight</CardDescription>
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

      <CartonizationDialog
        isOpen={showCartonization}
        onClose={() => setShowCartonization(false)}
        items={(() => {
          // Build items for the dialog when it opens
          if (orderItems && orderItems.length > 0) {
            return createItemsFromOrderData(orderItems, masterItems);
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
    </Card>
  );
};

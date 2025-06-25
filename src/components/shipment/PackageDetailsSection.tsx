
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
  const { boxes, createItemsFromShipmentData } = useCartonization();
  const { items: masterItems } = useItemMaster();
  
  // Load order items when component mounts or orderId changes
  useEffect(() => {
    const loadOrderItems = async () => {
      if (orderId) {
        try {
          console.log("Loading order items for cartonization:", orderId);
          const orderData = await fetchOrderById(orderId);
          if (orderData && orderData.items) {
            console.log("Order items loaded:", orderData.items);
            setOrderItems(orderData.items);
          }
        } catch (error) {
          console.error("Error loading order items:", error);
        }
      }
    };
    
    loadOrderItems();
  }, [orderId]);
  
  const handleOptimizePackaging = () => {
    console.log("Optimize packaging clicked");
    console.log("Order items:", orderItems);
    console.log("Master items:", masterItems);
    
    // First try to create items from order data
    let items: any[] = [];
    
    if (orderItems && orderItems.length > 0) {
      // Convert order items to cartonization items using Item Master data
      items = orderItems.map((orderItem, index) => {
        const masterItem = masterItems.find(item => item.id === orderItem.itemId);
        
        if (masterItem) {
          console.log(`Found master item for order item ${index}:`, masterItem);
          return {
            id: `order-item-${index}`,
            name: masterItem.name,
            length: masterItem.length,
            width: masterItem.width,
            height: masterItem.height,
            weight: masterItem.weight,
            quantity: orderItem.quantity || 1
          };
        } else {
          console.warn(`No master item found for order item:`, orderItem);
          // Fallback to basic item if no master data found
          return {
            id: `order-item-${index}`,
            name: `Item ${index + 1}`,
            length: 6, // Default dimensions
            width: 4,
            height: 2,
            weight: 1,
            quantity: orderItem.quantity || 1
          };
        }
      }).filter(item => item); // Remove any null items
    }
    
    // If no order items, fall back to form dimensions
    if (items.length === 0) {
      const formData = form.getValues();
      
      if (formData.length && formData.width && formData.height && formData.weight) {
        console.log("Using form dimensions for cartonization");
        items = createItemsFromShipmentData({
          length: formData.length,
          width: formData.width,
          height: formData.height,
          weight: formData.weight
        });
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
            return orderItems.map((orderItem, index) => {
              const masterItem = masterItems.find(item => item.id === orderItem.itemId);
              
              if (masterItem) {
                return {
                  id: `order-item-${index}`,
                  name: masterItem.name,
                  length: masterItem.length,
                  width: masterItem.width,
                  height: masterItem.height,
                  weight: masterItem.weight,
                  quantity: orderItem.quantity || 1
                };
              }
              return null;
            }).filter(item => item !== null);
          }
          
          // Fallback to form data
          const formData = form.getValues();
          if (formData.length && formData.width && formData.height && formData.weight) {
            return createItemsFromShipmentData({
              length: formData.length,
              width: formData.width,
              height: formData.height,
              weight: formData.weight
            });
          }
          
          return [];
        })()}
        availableBoxes={boxes}
        onSelectBox={handleSelectBox}
      />
    </Card>
  );
};

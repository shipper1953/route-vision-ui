import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { ShipmentForm } from "@/types/shipment";
import { useCartonization } from "@/hooks/useCartonization";
import { useItemMaster } from "@/hooks/useItemMaster";

export const usePackagingOptimization = (orderItems: any[]) => {
  const form = useFormContext<ShipmentForm>();
  const [showCartonization, setShowCartonization] = useState(false);
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [selectedBox, setSelectedBox] = useState<any>(null);
  const { boxes, createItemsFromOrderData } = useCartonization();
  const { items: masterItems } = useItemMaster();

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
    
    // CRITICAL FIX: Set selected box form fields so they're sent to backend
    form.setValue("selectedBoxId", box.id);
    form.setValue("selectedBoxSku", (box as any).sku || box.name);
    form.setValue("selectedBoxName", box.name);
    
    // Update selected box state
    setSelectedBox(box);
    
    console.log('Selected box for shipment:', {
      id: box.id,
      sku: (box as any).sku || box.name,
      name: box.name
    });
    
    toast.success(`Selected ${box.name} for optimal packaging`);
  };

  const handleItemsScanned = (items: any[]) => {
    console.log("Items scanned:", items);
    setScannedItems(items);
  };

  const buildCartonizationItems = () => {
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
  };

  return {
    showCartonization,
    setShowCartonization,
    handleOptimizePackaging,
    handleSelectBox,
    handleItemsScanned,
    buildCartonizationItems,
    boxes,
    selectedBox
  };
};
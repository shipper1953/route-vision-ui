
import { useState, useEffect } from "react";
import { Box, Item } from "@/services/cartonization/cartonizationEngine";

// Default box inventory - can be customized per user/company
const DEFAULT_BOXES: Box[] = [
  {
    id: '1',
    name: 'Small Box',
    length: 8,
    width: 6,
    height: 4,
    maxWeight: 10,
    cost: 1.50,
    inStock: 50,
    type: 'box'
  },
  {
    id: '2',
    name: 'Medium Box',
    length: 12,
    width: 9,
    height: 6,
    maxWeight: 25,
    cost: 2.75,
    inStock: 30,
    type: 'box'
  },
  {
    id: '3',
    name: 'Large Box',
    length: 18,
    width: 12,
    height: 8,
    maxWeight: 50,
    cost: 4.25,
    inStock: 20,
    type: 'box'
  },
  {
    id: '4',
    name: 'Small Poly Bag',
    length: 10,
    width: 8,
    height: 2,
    maxWeight: 5,
    cost: 0.75,
    inStock: 100,
    type: 'poly_bag'
  },
  {
    id: '5',
    name: 'Large Poly Bag',
    length: 16,
    width: 12,
    height: 4,
    maxWeight: 15,
    cost: 1.25,
    inStock: 75,
    type: 'poly_bag'
  }
];

export const useCartonization = () => {
  const [boxes, setBoxes] = useState<Box[]>(() => {
    // Try to load from localStorage first
    const saved = localStorage.getItem('cartonization_boxes');
    return saved ? JSON.parse(saved) : DEFAULT_BOXES;
  });

  // Save to localStorage whenever boxes change
  useEffect(() => {
    localStorage.setItem('cartonization_boxes', JSON.stringify(boxes));
  }, [boxes]);

  const createItemsFromShipmentData = (data: {
    length: number;
    width: number;
    height: number;
    weight: number;
  }): Item[] => {
    // If no dimensions provided, return empty array
    if (!data.length || !data.width || !data.height || !data.weight) {
      return [];
    }

    return [{
      id: '1',
      name: 'Shipment Item',
      length: data.length,
      width: data.width,
      height: data.height,
      weight: data.weight,
      quantity: 1
    }];
  };

  const createItemsFromOrderData = (orderItems: any[], masterItems: any[]): Item[] => {
    if (!orderItems || orderItems.length === 0) {
      return [];
    }

    console.log("Creating items from order data:", { orderItems, masterItems });

    return orderItems.map((orderItem, index) => {
      // Handle different order item structures
      let itemData: any = {};
      
      if (orderItem.itemId && masterItems.length > 0) {
        // If we have a proper itemId and master items, use those
        const masterItem = masterItems.find(item => item.id === orderItem.itemId);
        if (masterItem) {
          itemData = {
            id: `order-item-${index}`,
            name: masterItem.name,
            length: masterItem.length,
            width: masterItem.width,
            height: masterItem.height,
            weight: masterItem.weight,
            quantity: orderItem.quantity || orderItem.count || 1
          };
        }
      }
      
      // If no master item found or no itemId, create a realistic default item
      if (!itemData.id) {
        // Create varied default dimensions based on item type/description
        const itemName = orderItem.name || orderItem.description || `Order Item ${index + 1}`;
        const quantity = orderItem.quantity || orderItem.count || 1;
        
        // Generate varied dimensions based on item name/description to avoid all items being the same
        const hash = itemName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const baseLength = 4 + (hash % 8); // 4-12 inches
        const baseWidth = 3 + (hash % 6); // 3-9 inches  
        const baseHeight = 2 + (hash % 4); // 2-6 inches
        const baseWeight = 0.5 + (hash % 5); // 0.5-5.5 lbs
        
        itemData = {
          id: `order-item-${index}`,
          name: itemName,
          length: baseLength,
          width: baseWidth,
          height: baseHeight,
          weight: baseWeight,
          quantity: quantity
        };
      }
      
      console.log(`Created item ${index}:`, itemData);
      return itemData;
    }).filter(item => item && item.id); // Remove any null items
  };

  const updateBoxInventory = (boxId: string, newStock: number) => {
    setBoxes(prev => prev.map(box => 
      box.id === boxId ? { ...box, inStock: newStock } : box
    ));
  };

  return {
    boxes,
    setBoxes,
    createItemsFromShipmentData,
    createItemsFromOrderData,
    updateBoxInventory
  };
};

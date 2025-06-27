
import { useState, useEffect } from "react";
import { Box, Item, CartonizationParameters } from "@/services/cartonization/cartonizationEngine";

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

  const [parameters, setParameters] = useState<CartonizationParameters>(() => {
    const saved = localStorage.getItem('cartonization_parameters');
    return saved ? JSON.parse(saved) : {
      fillRateThreshold: 75,
      maxPackageWeight: 50,
      dimensionalWeightFactor: 139,
      packingEfficiency: 85,
      allowPartialFill: true,
      optimizeForCost: true,
      optimizeForSpace: false
    };
  });

  // Save to localStorage whenever boxes or parameters change
  useEffect(() => {
    localStorage.setItem('cartonization_boxes', JSON.stringify(boxes));
  }, [boxes]);

  useEffect(() => {
    localStorage.setItem('cartonization_parameters', JSON.stringify(parameters));
  }, [parameters]);

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

  // Enhanced item generation with more realistic scenarios
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
            quantity: orderItem.quantity || orderItem.count || 1,
            category: masterItem.category,
            fragility: masterItem.fragility || 'low'
          };
        }
      }
      
      // Enhanced realistic item generation for better recommendations
      if (!itemData.id) {
        const itemName = orderItem.name || orderItem.description || `Order Item ${index + 1}`;
        const quantity = orderItem.quantity || orderItem.count || 1;
        
        // Create more realistic and varied product scenarios
        const scenarios = [
          // Small electronics/accessories
          { length: 5, width: 3, height: 2, weight: 0.8, category: 'electronics' },
          { length: 6, width: 4, height: 3, weight: 1.2, category: 'electronics' },
          
          // Books/documents
          { length: 9, width: 6, height: 1, weight: 1.5, category: 'books' },
          { length: 11, width: 8, height: 2, weight: 2.8, category: 'books' },
          
          // Clothing items
          { length: 12, width: 9, height: 3, weight: 1.8, category: 'apparel' },
          { length: 14, width: 10, height: 4, weight: 2.5, category: 'apparel' },
          
          // Home goods/kitchen items
          { length: 8, width: 8, height: 6, weight: 3.2, category: 'home' },
          { length: 10, width: 8, height: 8, weight: 4.5, category: 'home' },
          
          // Sporting goods
          { length: 15, width: 6, height: 4, weight: 3.8, category: 'sports' },
          { length: 18, width: 8, height: 6, weight: 5.2, category: 'sports' },
          
          // Toys/games
          { length: 12, width: 9, height: 6, weight: 2.8, category: 'toys' },
          { length: 16, width: 12, height: 8, weight: 4.2, category: 'toys' },
          
          // Tools/hardware
          { length: 10, width: 6, height: 5, weight: 6.5, category: 'tools' },
          { length: 14, width: 8, height: 6, weight: 8.2, category: 'tools' },
          
          // Beauty/personal care
          { length: 6, width: 4, height: 8, weight: 1.8, category: 'beauty' },
          { length: 8, width: 6, height: 10, weight: 2.5, category: 'beauty' },
          
          // Automotive parts
          { length: 12, width: 8, height: 4, weight: 5.8, category: 'automotive' },
          { length: 16, width: 10, height: 6, weight: 8.5, category: 'automotive' },
          
          // Office supplies
          { length: 11, width: 8, height: 3, weight: 2.2, category: 'office' },
          { length: 13, width: 10, height: 4, weight: 3.5, category: 'office' }
        ];
        
        // Select scenario based on item description and order characteristics
        const hash = itemName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const scenarioIndex = hash % scenarios.length;
        const selectedScenario = scenarios[scenarioIndex];
        
        // Add some variation to make each order unique
        const variation = (hash % 20) / 100; // 0-19% variation
        
        itemData = {
          id: `order-item-${index}`,
          name: itemName,
          length: Math.round(selectedScenario.length * (1 + variation)),
          width: Math.round(selectedScenario.width * (1 + variation)),
          height: Math.round(selectedScenario.height * (1 + variation)),
          weight: Number((selectedScenario.weight * (1 + variation)).toFixed(1)),
          quantity: quantity,
          category: selectedScenario.category,
          fragility: 'low'
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

  const updateParameters = (newParameters: Partial<CartonizationParameters>) => {
    setParameters(prev => ({ ...prev, ...newParameters }));
  };

  return {
    boxes,
    setBoxes,
    parameters,
    updateParameters,
    createItemsFromShipmentData,
    createItemsFromOrderData,
    updateBoxInventory
  };
};

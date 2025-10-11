import { useState, useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { ShipmentForm } from "@/types/shipment";
import { useCartonization } from "@/hooks/useCartonization";
import { useItemMaster } from "@/hooks/useItemMaster";
import { CartonizationEngine, CartonizationResult } from "@/services/cartonization/cartonizationEngine";
import { MultiPackageCartonizationResult } from "@/services/cartonization/types";

export const useRecommendedBox = (orderItems: any[]) => {
  const form = useFormContext<ShipmentForm>();
  const [recommendedBox, setRecommendedBox] = useState<any>(null);
  const [boxUtilization, setBoxUtilization] = useState<number>(0);
  const [cartonizationResult, setCartonizationResult] = useState<CartonizationResult | null>(null);
  const [multiPackageResult, setMultiPackageResult] = useState<MultiPackageCartonizationResult | null>(null);
  const [needsMultiPackage, setNeedsMultiPackage] = useState<boolean>(false);
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
          
          // Try single-package first
          let result = engine.calculateOptimalBox(items, false);
          let multiPackage = null;
          let requiresMultiPackage = false;
          
          // If single package fails or has low confidence, try multi-package
          if (!result || result.confidence < 75) {
            console.log('Single-package solution insufficient, trying multi-package...');
            multiPackage = engine.calculateMultiPackageCartonization(items, 'balanced');
            
            if (multiPackage) {
              requiresMultiPackage = true;
              setMultiPackageResult(multiPackage);
              setNeedsMultiPackage(true);
              
              // Use first package for form values
              const firstPackage = multiPackage.packages[0];
              if (firstPackage) {
                result = {
                  recommendedBox: firstPackage.box,
                  utilization: firstPackage.utilization,
                  itemsFit: true,
                  totalWeight: multiPackage.totalWeight,
                  totalVolume: multiPackage.totalVolume,
                  dimensionalWeight: firstPackage.dimensionalWeight,
                  savings: 0,
                  confidence: multiPackage.confidence,
                  alternatives: multiPackage.packages.slice(1, 4).map(pkg => ({
                    box: pkg.box,
                    utilization: pkg.utilization,
                    cost: pkg.box.cost,
                    confidence: pkg.confidence
                  })),
                  rulesApplied: multiPackage.rulesApplied,
                  processingTime: multiPackage.processingTime,
                  multiPackageResult: multiPackage
                };
              }
            }
          } else {
            setNeedsMultiPackage(false);
            setMultiPackageResult(null);
          }
          
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
              
              if (requiresMultiPackage) {
                toast.success(`Multi-package solution: ${multiPackage!.totalPackages} packages needed`);
              } else {
                toast.success(`Recommended ${result.recommendedBox.name} with ${result.confidence}% confidence`);
              }
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

  return {
    recommendedBox,
    boxUtilization,
    cartonizationResult,
    multiPackageResult,
    needsMultiPackage
  };
};
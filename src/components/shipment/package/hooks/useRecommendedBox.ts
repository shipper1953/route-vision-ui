import { useState, useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { ShipmentForm } from "@/types/shipment";
import { useCartonization } from "@/hooks/useCartonization";
import { useItemMaster } from "@/hooks/useItemMaster";
import { usePackagingDecision } from "@/hooks/usePackagingDecision";
import { CartonizationEngine, CartonizationResult } from "@/services/cartonization/cartonizationEngine";
import { MultiPackageCartonizationResult } from "@/services/cartonization/types";

export const useRecommendedBox = (orderItems: any[], orderId?: number) => {
  const form = useFormContext<ShipmentForm>();
  const [recommendedBox, setRecommendedBox] = useState<any>(null);
  const [boxUtilization, setBoxUtilization] = useState<number>(0);
  const [cartonizationResult, setCartonizationResult] = useState<CartonizationResult | null>(null);
  const [multiPackageResult, setMultiPackageResult] = useState<MultiPackageCartonizationResult | null>(null);
  const [needsMultiPackage, setNeedsMultiPackage] = useState<boolean>(false);
  const { boxes, parameters, createItemsFromOrderData } = useCartonization();
  const { items: masterItems } = useItemMaster();
  const { getRecommendation } = usePackagingDecision();
  
  const calculatedItemsRef = useRef<string>('');
  const hasSetFormValuesRef = useRef(false);

  useEffect(() => {
    if (orderItems && orderItems.length > 0 && masterItems.length > 0) {
      const itemsKey = JSON.stringify(orderItems.map(item => item.itemId).sort());
      
      if (calculatedItemsRef.current === itemsKey) {
        return;
      }
      
      const items = createItemsFromOrderData(orderItems, masterItems);
      if (items.length === 0) return;

      // Try server-side decision first, fall back to client-side
      const calculate = async () => {
        try {
          const serverResult = await getRecommendation(items, orderId);
          
          if (serverResult?.recommended) {
            const rec = serverResult.recommended;
            const box = {
              id: rec.box.id,
              name: rec.box.name,
              length: rec.box.length,
              width: rec.box.width,
              height: rec.box.height,
              maxWeight: rec.box.max_weight,
              cost: rec.box.cost,
              inStock: 1,
              minStock: 0,
              maxStock: 100,
              type: 'box' as const,
            };

            setRecommendedBox(box);
            setBoxUtilization(rec.utilization);
            setNeedsMultiPackage(false);
            setMultiPackageResult(null);
            setCartonizationResult({
              recommendedBox: box,
              utilization: rec.utilization,
              itemsFit: true,
              totalWeight: serverResult.metadata.total_weight,
              totalVolume: serverResult.metadata.total_volume,
              dimensionalWeight: rec.dimensional_weight,
              savings: 0,
              confidence: rec.confidence,
              alternatives: serverResult.alternatives.map(a => ({
                box: { id: a.box_id, name: a.box_name, length: 0, width: 0, height: 0, maxWeight: 0, cost: a.cost, inStock: 1, minStock: 0, maxStock: 100, type: 'box' as const },
                utilization: a.utilization,
                cost: a.cost,
                confidence: a.score,
              })),
              rulesApplied: [serverResult.metadata.optimization_objective],
              processingTime: 0,
              explanation: {
                selectedBox: {
                  id: rec.box_id,
                  name: rec.box_name,
                  score: rec.score,
                  volumeUtilization: rec.utilization,
                  dimensionalWeight: rec.dimensional_weight,
                  cost: rec.box.cost,
                  outerVolume: rec.box.length * rec.box.width * rec.box.height,
                },
                rejectedCandidates: serverResult.rejected_candidates.map(r => ({
                  id: r.box_id,
                  name: r.box_name,
                  reason: r.reason,
                  score: r.score,
                })),
                tieBreakersApplied: serverResult.metadata.tie_breakers,
                reasonCode: rec.reason_code,
                algorithmVersion: serverResult.metadata.algorithm_version,
                policyVersion: serverResult.metadata.policy_version_id || undefined,
                optimizationObjective: serverResult.metadata.optimization_objective as 'smallest_fit' | 'lowest_landed_cost' | 'multi_package_required' | 'balanced',
              },
            });

            if (!hasSetFormValuesRef.current) {
              form.setValue("length", rec.box.length);
              form.setValue("width", rec.box.width);
              form.setValue("height", rec.box.height);
              const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
              form.setValue("weight", totalWeight);
              hasSetFormValuesRef.current = true;
              toast.success(`Recommended ${rec.box_name} with ${rec.confidence}% confidence`);
            }

            calculatedItemsRef.current = itemsKey;
            return;
          }
        } catch (err) {
          console.warn("Server-side packaging decision failed, falling back to client-side:", err);
        }

        // Fallback: client-side engine
        try {
          const engine = new CartonizationEngine(boxes, parameters);
          let result = engine.calculateOptimalBox(items, false);
          let multiPackage = null;
          let requiresMultiPackage = false;
          
          if (!result || result.confidence < 75) {
            multiPackage = engine.calculateMultiPackageCartonization(items, 'balanced');
            if (multiPackage) {
              requiresMultiPackage = true;
              setMultiPackageResult(multiPackage);
              setNeedsMultiPackage(true);
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
                    confidence: pkg.confidence,
                  })),
                  rulesApplied: multiPackage.rulesApplied,
                  processingTime: multiPackage.processingTime,
                  multiPackageResult: multiPackage,
                };
              }
            }
          } else {
            setNeedsMultiPackage(false);
            setMultiPackageResult(null);
          }
          
          if (result) {
            setRecommendedBox(result.recommendedBox);
            setBoxUtilization(result.utilization);
            setCartonizationResult(result);
            
            if (!hasSetFormValuesRef.current) {
              form.setValue("length", result.recommendedBox.length);
              form.setValue("width", result.recommendedBox.width);
              form.setValue("height", result.recommendedBox.height);
              const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
              form.setValue("weight", totalWeight);
              hasSetFormValuesRef.current = true;
              if (requiresMultiPackage) {
                toast.success(`Multi-package solution: ${multiPackage!.totalPackages} packages needed`);
              } else {
                toast.success(`Recommended ${result.recommendedBox.name} with ${result.confidence}% confidence`);
              }
            }
            calculatedItemsRef.current = itemsKey;
          }
        } catch (error) {
          console.error("Error calculating recommended box:", error);
        }
      };

      calculate();
    }
  }, [orderItems, masterItems, boxes, parameters, createItemsFromOrderData, form, orderId, getRecommendation]);

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
    needsMultiPackage,
  };
};

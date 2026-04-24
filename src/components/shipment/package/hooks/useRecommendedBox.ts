import { useState, useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { ShipmentForm } from "@/types/shipment";
import { useItemMaster } from "@/hooks/useItemMaster";
import { usePackagingDecision } from "@/hooks/usePackagingDecision";
import { CartonizationResult } from "@/services/cartonization/cartonizationEngine";
import { MultiPackageCartonizationResult } from "@/services/cartonization/types";
import { useCartonization } from "@/hooks/useCartonization";

export const useRecommendedBox = (orderItems: any[], orderId?: number) => {
  const form = useFormContext<ShipmentForm>();
  const [recommendedBox, setRecommendedBox] = useState<any>(null);
  const [boxUtilization, setBoxUtilization] = useState<number>(0);
  const [cartonizationResult, setCartonizationResult] = useState<CartonizationResult | null>(null);
  const [multiPackageResult, setMultiPackageResult] = useState<MultiPackageCartonizationResult | null>(null);
  const [needsMultiPackage, setNeedsMultiPackage] = useState<boolean>(false);
  const { createItemsFromOrderData } = useCartonization();
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

      // Use canonical server-side decision to keep logic consistent across flows.
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
            const multiPackage = (serverResult as any).multi_package;
            const hasMultiPackage = !!(multiPackage?.packages?.length && multiPackage.total_packages > 1);
            setNeedsMultiPackage(hasMultiPackage);
            setMultiPackageResult(
              hasMultiPackage
                ? {
                    packages: multiPackage.packages.map((pkg: any) => ({
                      box: pkg.box,
                      assignedItems: pkg.items || [],
                      utilization: pkg.utilization,
                      packageWeight: pkg.total_weight || 0,
                      packageVolume: 0,
                      dimensionalWeight: pkg.dimensional_weight,
                      confidence: rec.confidence,
                      packingResult: { success: true, packedItems: [], usedVolume: 0, packingEfficiency: 0 }
                    })),
                    totalPackages: multiPackage.total_packages,
                    totalWeight: serverResult.metadata.total_weight,
                    totalVolume: serverResult.metadata.total_volume,
                    totalCost: multiPackage.total_cost || 0,
                    splittingStrategy: 'hybrid',
                    optimizationObjective: 'balanced',
                    confidence: rec.confidence,
                    alternatives: [],
                    rulesApplied: ['canonical_server_multi_package'],
                    processingTime: 0
                  }
                : null
            );
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
          toast.error('No packaging recommendation returned for these items.');
        } catch (err) {
          console.error("Server-side packaging decision failed:", err);
          toast.error("Unable to compute packaging recommendation right now.");
        }
      };

      calculate();
    }
  }, [orderItems, masterItems, createItemsFromOrderData, form, orderId, getRecommendation]);

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

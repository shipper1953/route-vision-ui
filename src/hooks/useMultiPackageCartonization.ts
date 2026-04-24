import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { MultiPackageCartonizationResult, Item, PackageRecommendation } from '@/services/cartonization/types';
import { useCartonization } from '@/hooks/useCartonization';
import { usePackagingDecision } from '@/hooks/usePackagingDecision';

export const useMultiPackageCartonization = () => {
  const [multiPackageResult, setMultiPackageResult] = useState<MultiPackageCartonizationResult | null>(null);
  const [selectedPackageIndex, setSelectedPackageIndex] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);

  const { boxes, parameters } = useCartonization();
  const { getRecommendation } = usePackagingDecision();

  const calculateMultiPackage = useCallback(async (
    items: Item[],
    optimizationObjective: 'minimize_packages' | 'minimize_cost' | 'balanced' = 'balanced',
    orderId?: number
  ) => {
    if (!items.length) {
      toast.error('No items available for multi-package cartonization');
      return null;
    }

    setIsCalculating(true);
    try {
      console.log('🚀 Running canonical server-side cartonization (packaging-decision)...');

      const serverResult = await getRecommendation(items, orderId);
      if (!serverResult?.recommended) {
        toast.error('No viable package solution returned from server');
        return null;
      }

      // Build package list. If server returned a multi_package split, use it.
      // Otherwise, fall back to a single package using the recommended box.
      const serverPackages = serverResult.multi_package?.packages?.length
        ? serverResult.multi_package.packages
        : [{
            box: serverResult.recommended.box,
            items: items,
            utilization: serverResult.recommended.utilization,
            dimensional_weight: serverResult.recommended.dimensional_weight,
            void_ratio: serverResult.recommended.void_ratio,
            total_weight: serverResult.metadata.total_weight,
          }];

      const mappedPackages: PackageRecommendation[] = serverPackages.map((pkg: any) => {
        const box = pkg.box || {};
        const mappedBox: any = {
          id: box.id,
          name: box.name,
          sku: box.sku,
          length: Number(box.length) || 0,
          width: Number(box.width) || 0,
          height: Number(box.height) || 0,
          maxWeight: Number(box.max_weight ?? box.maxWeight) || 0,
          cost: Number(box.cost) || 0,
          inStock: 1,
          minStock: 0,
          maxStock: 100,
          type: (box.box_type || box.type || 'box') as any,
        };
        const assignedItems: Item[] = Array.isArray(pkg.items) ? pkg.items : [];
        const packageWeight = Number(pkg.total_weight) || assignedItems.reduce(
          (s, it: any) => s + (Number(it.weight) || 0) * (Number(it.quantity) || 1), 0
        );
        const packageVolume = assignedItems.reduce(
          (s, it: any) => s + (Number(it.length) || 0) * (Number(it.width) || 0) * (Number(it.height) || 0) * (Number(it.quantity) || 1), 0
        );
        return {
          box: mappedBox,
          assignedItems,
          utilization: Number(pkg.utilization) || 0,
          packageWeight,
          packageVolume,
          dimensionalWeight: Number(pkg.dimensional_weight) || 0,
          confidence: serverResult.recommended.confidence ?? 90,
          packingResult: {
            success: true,
            packedItems: [] as any,
            usedVolume: packageVolume,
            packingEfficiency: Number(pkg.utilization) || 0,
          },
        } as PackageRecommendation;
      });

      const totalCost = serverResult.multi_package?.total_cost
        ?? mappedPackages.reduce((s, p) => s + (Number(p.box.cost) || 0), 0);

      const result: MultiPackageCartonizationResult = {
        packages: mappedPackages,
        totalPackages: mappedPackages.length,
        totalWeight: serverResult.metadata.total_weight,
        totalVolume: serverResult.metadata.total_volume,
        totalCost,
        splittingStrategy: 'hybrid',
        optimizationObjective: optimizationObjective,
        confidence: serverResult.recommended.confidence ?? 90,
        alternatives: [],
        rulesApplied: ['canonical_server_packaging_decision', serverResult.metadata.algorithm_version],
        processingTime: 0,
      };

      setMultiPackageResult(result);
      setSelectedPackageIndex(0);

      toast.success(
        `Server recommendation: ${result.totalPackages} package${result.totalPackages !== 1 ? 's' : ''} (${result.confidence}% confidence)`
      );
      return result;
    } catch (error) {
      console.error('❌ Multi-package cartonization failed:', error);
      toast.error('Failed to calculate multi-package solution');
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, [getRecommendation]);

  const addManualPackage = useCallback(() => {
    if (!multiPackageResult) return;

    // Find the smallest available box as default for new package
    const sortedBoxes = [...boxes].sort((a, b) => 
      (a.length * a.width * a.height) - (b.length * b.width * b.height)
    );
    
    const defaultBox = sortedBoxes[0];
    if (!defaultBox) {
      toast.error('No boxes available for new package');
      return;
    }

    const newPackage = {
      box: defaultBox,
      assignedItems: [],
      utilization: 0,
      packageWeight: 0,
      packageVolume: 0,
      dimensionalWeight: 0,
      confidence: 50,
      packingResult: {
        success: true,
        packedItems: [],
        usedVolume: 0,
        packingEfficiency: 0
      }
    };

    const updatedResult = {
      ...multiPackageResult,
      packages: [...multiPackageResult.packages, newPackage],
      totalPackages: multiPackageResult.totalPackages + 1,
      rulesApplied: [...multiPackageResult.rulesApplied, 'Manual Package Addition']
    };

    setMultiPackageResult(updatedResult);
    setSelectedPackageIndex(updatedResult.packages.length - 1);
    
    toast.success('New package added');
  }, [multiPackageResult, boxes]);

  const editPackage = useCallback((packageIndex: number, updatedPackage: any) => {
    if (!multiPackageResult) return;

    const updatedPackages = [...multiPackageResult.packages];
    const current = { ...updatedPackages[packageIndex], ...updatedPackage } as any;

    // Recalculate per-package metrics if assignedItems or box changed
    try {
      const box = current.box;
      const boxVolume = (box?.length ?? 0) * (box?.width ?? 0) * (box?.height ?? 0);
      const divisor = (parameters as any)?.dimensionalWeightFactor || 139;

      const items = current.assignedItems || [];
      let packageWeight = 0;
      let usedVolume = 0;

      for (const it of items) {
        const qty = Number(it.quantity ?? 1);
        const l = Number(it.length ?? it.dimensions?.length ?? 0);
        const w = Number(it.width ?? it.dimensions?.width ?? 0);
        const h = Number(it.height ?? it.dimensions?.height ?? 0);
        const wt = Number(it.weight ?? it.dimensions?.weight ?? 0);
        packageWeight += wt * qty;
        usedVolume += l * w * h * qty;
      }

      const dimensionalWeight = boxVolume > 0 ? (box.length * box.width * box.height) / divisor : 0;
      const utilization = boxVolume > 0 ? Math.min(100, (usedVolume / boxVolume) * 100) : 0;

      current.packageWeight = packageWeight;
      current.packageVolume = usedVolume;
      current.dimensionalWeight = Number(dimensionalWeight.toFixed(2));
      current.utilization = Number(utilization.toFixed(1));
      current.packingResult = {
        success: true,
        packedItems: items,
        usedVolume,
        packingEfficiency: current.utilization
      };
    } catch (e) {
      console.warn('Failed to recalculate package metrics, keeping previous where possible', e);
    }

    updatedPackages[packageIndex] = current;

    // Recalculate totals
    const totalWeight = updatedPackages.reduce((sum, pkg: any) => sum + (Number(pkg.packageWeight) || 0), 0);
    const totalCost = updatedPackages.reduce((sum, pkg: any) => sum + (Number(pkg.box?.cost) || 0), 0);
    const totalVolume = updatedPackages.reduce((sum, pkg: any) => sum + (Number(pkg.packageVolume) || 0), 0);

    const updatedResult = {
      ...multiPackageResult,
      packages: updatedPackages,
      totalWeight,
      totalCost,
      totalVolume,
      rulesApplied: [...multiPackageResult.rulesApplied, 'Manual Package Edit']
    } as any;

    setMultiPackageResult(updatedResult);
    toast.success('Package updated successfully');
  }, [multiPackageResult, parameters]);

  const removePackage = useCallback((packageIndex: number) => {
    if (!multiPackageResult || multiPackageResult.packages.length <= 1) {
      toast.error('Cannot remove the last package');
      return;
    }

    const updatedPackages = multiPackageResult.packages.filter((_, index) => index !== packageIndex);
    
    // Recalculate totals
    const totalWeight = updatedPackages.reduce((sum, pkg: any) => sum + (Number(pkg.packageWeight) || 0), 0);
    const totalCost = updatedPackages.reduce((sum, pkg: any) => sum + (Number(pkg.box?.cost) || 0), 0);
    const totalVolume = updatedPackages.reduce((sum, pkg: any) => sum + (Number(pkg.packageVolume) || 0), 0);

    const updatedResult = {
      ...multiPackageResult,
      packages: updatedPackages,
      totalPackages: updatedPackages.length,
      totalWeight,
      totalCost,
      totalVolume,
      rulesApplied: [...multiPackageResult.rulesApplied, 'Manual Package Removal']
    };

    setMultiPackageResult(updatedResult);
    
    // Adjust selected index if needed
    if (selectedPackageIndex >= updatedPackages.length) {
      setSelectedPackageIndex(updatedPackages.length - 1);
    }
    
    toast.success('Package removed');
  }, [multiPackageResult, selectedPackageIndex]);

  const resetMultiPackage = useCallback(() => {
    setMultiPackageResult(null);
    setSelectedPackageIndex(0);
  }, []);

  const getSelectedPackage = useCallback(() => {
    if (!multiPackageResult || selectedPackageIndex >= multiPackageResult.packages.length) {
      return null;
    }
    return multiPackageResult.packages[selectedPackageIndex];
  }, [multiPackageResult, selectedPackageIndex]);

  return {
    multiPackageResult,
    selectedPackageIndex,
    selectedPackage: getSelectedPackage(),
    isCalculating,
    calculateMultiPackage,
    addManualPackage,
    editPackage,
    removePackage,
    resetMultiPackage,
    setSelectedPackageIndex
  };
};
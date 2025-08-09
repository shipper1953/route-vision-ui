import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { MultiPackageCartonizationResult, Item } from '@/services/cartonization/types';
import { useCartonization } from '@/hooks/useCartonization';
import { CartonizationEngine } from '@/services/cartonization/cartonizationEngine';

export const useMultiPackageCartonization = () => {
  const [multiPackageResult, setMultiPackageResult] = useState<MultiPackageCartonizationResult | null>(null);
  const [selectedPackageIndex, setSelectedPackageIndex] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const { boxes, parameters } = useCartonization();

  const calculateMultiPackage = useCallback(async (
    items: Item[],
    optimizationObjective: 'minimize_packages' | 'minimize_cost' | 'balanced' = 'balanced'
  ) => {
    if (!items.length || !boxes.length) {
      toast.error('No items or boxes available for multi-package cartonization');
      return null;
    }

    setIsCalculating(true);
    try {
      console.log('🚀 Starting multi-package cartonization...');
      
      const engine = new CartonizationEngine(boxes, parameters);
      const result = engine.calculateMultiPackageCartonization(items, optimizationObjective);
      
      if (result) {
        setMultiPackageResult(result);
        setSelectedPackageIndex(0);
        
        toast.success(
          `Multi-package solution: ${result.totalPackages} packages with ${result.confidence}% confidence`
        );
        
        console.log('✅ Multi-package cartonization completed:', result);
        return result;
      } else {
        toast.error('No viable multi-package solution found');
        return null;
      }
    } catch (error) {
      console.error('❌ Multi-package cartonization failed:', error);
      toast.error('Failed to calculate multi-package solution');
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, [boxes, parameters]);

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
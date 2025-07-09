import { Box, CartonizationParameters } from './types';

export class CartonizationUtils {
  static calculateDimensionalWeight(box: Box, dimensionalWeightFactor: number): number {
    return (box.length * box.width * box.height) / dimensionalWeightFactor;
  }

  static calculateConfidence(
    actualUtilization: number,
    totalWeight: number,
    box: Box,
    packingEfficiency: number
  ): number {
    let confidence = 0;
    
    // Utilization factor (optimal around 75-85%)
    if (actualUtilization >= 75 && actualUtilization <= 85) {
      confidence += 40;
    } else if (actualUtilization >= 65 && actualUtilization < 95) {
      confidence += 30;
    } else if (actualUtilization >= 50) {
      confidence += 20;
    } else {
      confidence += 10;
    }
    
    // Weight distribution factor
    if (totalWeight <= box.maxWeight * 0.8) {
      confidence += 20;
    } else {
      confidence += 10;
    }
    
    // Cost efficiency factor
    const boxVolume = box.length * box.width * box.height;
    const costPerCubicInch = box.cost / boxVolume;
    confidence += Math.min(20, (1 / costPerCubicInch) * 10);
    
    // Packing efficiency bonus
    if (packingEfficiency > 0.9) {
      confidence += 10;
    } else if (packingEfficiency > 0.8) {
      confidence += 5;
    }
    
    return Math.min(100, confidence);
  }

  static sortBoxesByOptimization(
    boxes: any[],
    parameters: CartonizationParameters
  ): any[] {
    const sortedBoxes = [...boxes];
    
    if (parameters.optimizeForCost) {
      sortedBoxes.sort((a, b) => {
        // Balance cost vs utilization vs confidence
        const aScore = a.confidence * 0.5 + (100 - (a.cost / Math.max(...boxes.map(f => f.cost)) * 100)) * 0.3 + a.utilization * 0.2;
        const bScore = b.confidence * 0.5 + (100 - (b.cost / Math.max(...boxes.map(f => f.cost)) * 100)) * 0.3 + b.utilization * 0.2;
        return bScore - aScore;
      });
    } else if (parameters.optimizeForSpace) {
      sortedBoxes.sort((a, b) => b.utilization - a.utilization);
    } else {
      sortedBoxes.sort((a, b) => b.confidence - a.confidence);
    }
    
    return sortedBoxes;
  }

  static calculateItemsMetrics(items: any[]): { totalWeight: number; totalVolume: number } {
    const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    const totalVolume = items.reduce((sum, item) => 
      sum + (item.length * item.width * item.height * item.quantity), 0
    );
    
    return { totalWeight, totalVolume };
  }
}
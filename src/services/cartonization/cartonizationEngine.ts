
export interface Item {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  quantity: number;
  fragility?: 'low' | 'medium' | 'high';
  category?: string;
}

export interface Box {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  maxWeight: number;
  cost: number;
  inStock: number;
  type: 'box' | 'poly_bag';
  materialCost?: number;
}

export interface CartonizationParameters {
  fillRateThreshold: number;
  maxPackageWeight: number;
  dimensionalWeightFactor: number;
  packingEfficiency: number;
  allowPartialFill: boolean;
  optimizeForCost: boolean;
  optimizeForSpace: boolean;
}

export interface CartonizationResult {
  recommendedBox: Box;
  utilization: number;
  itemsFit: boolean;
  totalWeight: number;
  totalVolume: number;
  dimensionalWeight: number;
  savings: number;
  confidence: number;
  alternatives: Array<{
    box: Box;
    utilization: number;
    cost: number;
    confidence: number;
  }>;
  rulesApplied: string[];
  processingTime: number;
}

export class CartonizationEngine {
  private boxes: Box[];
  private parameters: CartonizationParameters;

  constructor(boxes: Box[], parameters?: Partial<CartonizationParameters>) {
    this.boxes = boxes.filter(box => box.inStock > 0);
    this.parameters = {
      fillRateThreshold: 75,
      maxPackageWeight: 50,
      dimensionalWeightFactor: 139,
      packingEfficiency: 85,
      allowPartialFill: true,
      optimizeForCost: true,
      optimizeForSpace: false,
      ...parameters
    };
  }

  calculateOptimalBox(items: Item[]): CartonizationResult | null {
    const startTime = Date.now();
    
    if (!items.length || !this.boxes.length) return null;

    const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    const totalVolume = items.reduce((sum, item) => 
      sum + (item.length * item.width * item.height * item.quantity), 0
    );

    // Filter boxes that can handle the weight
    const suitableBoxes = this.boxes.filter(box => {
      return box.maxWeight >= totalWeight && totalWeight <= this.parameters.maxPackageWeight;
    });
    
    if (!suitableBoxes.length) return null;

    const rulesApplied: string[] = [];
    
    // Calculate analysis for each suitable box
    const boxAnalysis = suitableBoxes.map(box => {
      const boxVolume = box.length * box.width * box.height;
      const utilization = Math.min((totalVolume / boxVolume) * 100, 100);
      const itemsFit = this.checkItemsFit(items, box);
      const dimensionalWeight = this.calculateDimensionalWeight(box);
      
      // Calculate confidence based on multiple factors
      let confidence = 0;
      
      // Utilization factor (optimal around 75-85%)
      if (utilization >= 75 && utilization <= 85) {
        confidence += 40;
      } else if (utilization >= 65 && utilization < 95) {
        confidence += 30;
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
      const costPerCubicInch = box.cost / (box.length * box.width * box.height);
      confidence += Math.min(20, (1 / costPerCubicInch) * 10);
      
      // Items fit factor
      if (itemsFit) {
        confidence += 20;
      }
      
      return {
        box,
        utilization,
        itemsFit,
        cost: box.cost,
        dimensionalWeight,
        confidence: Math.min(100, confidence),
        volumeEfficiency: utilization
      };
    });

    // Filter to boxes where items actually fit
    const fittingBoxes = boxAnalysis.filter(analysis => analysis.itemsFit);
    
    if (!fittingBoxes.length) return null;

    // Apply business rules for selection
    let sortedBoxes = [...fittingBoxes];
    
    if (this.parameters.optimizeForCost) {
      rulesApplied.push('Cost Optimization Rule');
      sortedBoxes.sort((a, b) => {
        // Balance cost vs utilization
        const aScore = a.confidence * 0.6 + (100 - (a.cost / Math.max(...fittingBoxes.map(f => f.cost)) * 100)) * 0.4;
        const bScore = b.confidence * 0.6 + (100 - (b.cost / Math.max(...fittingBoxes.map(f => f.cost)) * 100)) * 0.4;
        return bScore - aScore;
      });
    } else if (this.parameters.optimizeForSpace) {
      rulesApplied.push('Space Optimization Rule');
      sortedBoxes.sort((a, b) => b.utilization - a.utilization);
    } else {
      rulesApplied.push('Balanced Optimization Rule');
      sortedBoxes.sort((a, b) => b.confidence - a.confidence);
    }

    // Apply fill rate threshold rule
    if (this.parameters.fillRateThreshold > 0) {
      rulesApplied.push(`Fill Rate Threshold (${this.parameters.fillRateThreshold}%)`);
      sortedBoxes = sortedBoxes.filter(analysis => 
        analysis.utilization >= this.parameters.fillRateThreshold || this.parameters.allowPartialFill
      );
    }

    if (!sortedBoxes.length) return null;

    const recommendedAnalysis = sortedBoxes[0];
    const alternatives = sortedBoxes.slice(1, 4).map(analysis => ({
      box: analysis.box,
      utilization: analysis.utilization,
      cost: analysis.cost,
      confidence: analysis.confidence
    }));

    // Calculate potential savings compared to largest suitable box
    const largestBox = suitableBoxes.reduce((max, box) => 
      (box.length * box.width * box.height) > (max.length * max.width * max.height) ? box : max
    );
    const savings = Math.max(0, largestBox.cost - recommendedAnalysis.box.cost);

    const processingTime = Date.now() - startTime;

    rulesApplied.push('Dimensional Weight Calculation');
    rulesApplied.push('Item Fit Validation');

    return {
      recommendedBox: recommendedAnalysis.box,
      utilization: recommendedAnalysis.utilization,
      itemsFit: true,
      totalWeight,
      totalVolume,
      dimensionalWeight: recommendedAnalysis.dimensionalWeight,
      savings,
      confidence: recommendedAnalysis.confidence,
      alternatives,
      rulesApplied,
      processingTime
    };
  }

  private calculateDimensionalWeight(box: Box): number {
    return (box.length * box.width * box.height) / this.parameters.dimensionalWeightFactor;
  }

  private checkItemsFit(items: Item[], box: Box): boolean {
    // Enhanced 3D bin packing algorithm
    const sortedItems = [...items].sort((a, b) => 
      (b.length * b.width * b.height) - (a.length * a.width * a.height)
    );

    // Simple volume check first
    const totalItemVolume = items.reduce((sum, item) => 
      sum + (item.length * item.width * item.height * item.quantity), 0
    );
    const boxVolume = box.length * box.width * box.height;
    
    if (totalItemVolume > boxVolume * (this.parameters.packingEfficiency / 100)) {
      return false;
    }

    // More sophisticated fit checking
    let currentPosition = { x: 0, y: 0, z: 0 };
    let remainingSpace = {
      length: box.length,
      width: box.width,
      height: box.height
    };

    for (const item of sortedItems) {
      for (let i = 0; i < item.quantity; i++) {
        // Check if item fits in any orientation
        const orientations = [
          [item.length, item.width, item.height],
          [item.length, item.height, item.width],
          [item.width, item.length, item.height],
          [item.width, item.height, item.length],
          [item.height, item.length, item.width],
          [item.height, item.width, item.length]
        ];

        let itemPlaced = false;
        for (const [l, w, h] of orientations) {
          if (l <= remainingSpace.length && w <= remainingSpace.width && h <= remainingSpace.height) {
            // Simulate placing the item
            remainingSpace.length = Math.max(0, remainingSpace.length - l);
            itemPlaced = true;
            break;
          }
        }

        if (!itemPlaced) {
          return false;
        }
      }
    }

    return true;
  }

  // Test a specific scenario
  testScenario(scenario: {
    items: Item[];
    destination?: string;
    carrier?: string;
    serviceLevel?: string;
  }): CartonizationResult | null {
    // Add scenario-specific logic here
    return this.calculateOptimalBox(scenario.items);
  }
}

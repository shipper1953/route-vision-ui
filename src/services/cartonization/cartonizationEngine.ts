
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

interface PackedItem {
  item: Item;
  x: number;
  y: number;
  z: number;
  length: number;
  width: number;
  height: number;
  rotated: boolean;
}

interface Space {
  x: number;
  y: number;
  z: number;
  length: number;
  width: number;
  height: number;
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
    
    if (!items.length || !this.boxes.length) {
      console.log('❌ No items or boxes available for cartonization');
      return null;
    }

    const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    const totalVolume = items.reduce((sum, item) => 
      sum + (item.length * item.width * item.height * item.quantity), 0
    );

    console.log(`Cartonization input - Items: ${items.length}, Total weight: ${totalWeight}, Total volume: ${totalVolume}`);

    // Filter boxes that can handle the weight
    const suitableBoxes = this.boxes.filter(box => {
      const canHandleWeight = box.maxWeight >= totalWeight && totalWeight <= this.parameters.maxPackageWeight;
      console.log(`Box ${box.name}: maxWeight=${box.maxWeight}, totalWeight=${totalWeight}, suitable=${canHandleWeight}`);
      return canHandleWeight;
    });
    
    if (!suitableBoxes.length) {
      console.log('❌ No suitable boxes found based on weight constraints');
      return null;
    }

    console.log(`Found ${suitableBoxes.length} suitable boxes for weight constraint`);

    const rulesApplied: string[] = [];
    
    // Calculate analysis for each suitable box with enhanced 3D packing
    const boxAnalysis = suitableBoxes.map(box => {
      const boxVolume = box.length * box.width * box.height;
      const basicUtilization = Math.min((totalVolume / boxVolume) * 100, 100);
      
      // Use enhanced 3D bin packing to check if items actually fit
      const packingResult = this.enhanced3DBinPacking(items, box);
      const itemsFit = packingResult.success;
      const actualUtilization = packingResult.success ? 
        (packingResult.usedVolume / boxVolume) * 100 : 0;
      
      const dimensionalWeight = this.calculateDimensionalWeight(box);
      
      console.log(`Box ${box.name} analysis:`, {
        basicUtilization: basicUtilization.toFixed(1),
        actualUtilization: actualUtilization.toFixed(1),
        itemsFit,
        usedVolume: packingResult.usedVolume,
        boxVolume,
        packedItems: packingResult.packedItems?.length || 0
      });
      
      // Calculate confidence based on multiple factors
      let confidence = 0;
      
      if (!itemsFit) {
        confidence = 0;
      } else {
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
        const costPerCubicInch = box.cost / boxVolume;
        confidence += Math.min(20, (1 / costPerCubicInch) * 10);
        
        // Packing efficiency bonus
        if (packingResult.packingEfficiency > 0.9) {
          confidence += 10;
        } else if (packingResult.packingEfficiency > 0.8) {
          confidence += 5;
        }
      }
      
      return {
        box,
        utilization: actualUtilization,
        itemsFit,
        cost: box.cost,
        dimensionalWeight,
        confidence: Math.min(100, confidence),
        volumeEfficiency: actualUtilization,
        packingResult
      };
    });

    // Filter to boxes where items actually fit
    const fittingBoxes = boxAnalysis.filter(analysis => analysis.itemsFit);
    
    console.log(`${fittingBoxes.length} boxes can actually fit all items`);
    
    if (!fittingBoxes.length) {
      console.log('❌ No boxes can fit all items with enhanced 3D packing');
      return null;
    }

    // Apply business rules for selection
    let sortedBoxes = [...fittingBoxes];
    
    if (this.parameters.optimizeForCost) {
      rulesApplied.push('Cost Optimization Rule');
      sortedBoxes.sort((a, b) => {
        // Balance cost vs utilization vs confidence
        const aScore = a.confidence * 0.5 + (100 - (a.cost / Math.max(...fittingBoxes.map(f => f.cost)) * 100)) * 0.3 + a.utilization * 0.2;
        const bScore = b.confidence * 0.5 + (100 - (b.cost / Math.max(...fittingBoxes.map(f => f.cost)) * 100)) * 0.3 + b.utilization * 0.2;
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

    if (!sortedBoxes.length) {
      console.log('❌ No boxes meet fill rate threshold');
      return null;
    }

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

    rulesApplied.push('Enhanced 3D Bin Packing Algorithm');
    rulesApplied.push('Multi-Orientation Item Fitting');
    rulesApplied.push('Dimensional Weight Calculation');

    console.log(`✅ Recommended box: ${recommendedAnalysis.box.name} with ${recommendedAnalysis.confidence}% confidence`);

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

  private enhanced3DBinPacking(items: Item[], box: Box): {
    success: boolean;
    packedItems: PackedItem[];
    usedVolume: number;
    packingEfficiency: number;
  } {
    // Expand items by quantity
    const expandedItems: Item[] = [];
    items.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        expandedItems.push({ ...item, quantity: 1 });
      }
    });

    // Sort items by volume (largest first) for better packing
    const sortedItems = expandedItems.sort((a, b) => 
      (b.length * b.width * b.height) - (a.length * a.width * a.height)
    );

    const packedItems: PackedItem[] = [];
    const spaces: Space[] = [{
      x: 0, y: 0, z: 0,
      length: box.length,
      width: box.width,
      height: box.height
    }];

    console.log(`Starting 3D bin packing for ${sortedItems.length} items in box ${box.name} (${box.length}x${box.width}x${box.height})`);

    for (const item of sortedItems) {
      let itemPacked = false;
      
      // Try to find a space where this item fits
      for (let spaceIndex = 0; spaceIndex < spaces.length && !itemPacked; spaceIndex++) {
        const space = spaces[spaceIndex];
        
        // Try all 6 possible orientations of the item
        const orientations = [
          { l: item.length, w: item.width, h: item.height, rotated: false },
          { l: item.length, w: item.height, h: item.width, rotated: true },
          { l: item.width, w: item.length, h: item.height, rotated: true },
          { l: item.width, w: item.height, h: item.length, rotated: true },
          { l: item.height, w: item.length, h: item.width, rotated: true },
          { l: item.height, w: item.width, h: item.length, rotated: true }
        ];

        for (const orientation of orientations) {
          if (orientation.l <= space.length && 
              orientation.w <= space.width && 
              orientation.h <= space.height) {
            
            // Item fits in this orientation
            const packedItem: PackedItem = {
              item,
              x: space.x,
              y: space.y,
              z: space.z,
              length: orientation.l,
              width: orientation.w,
              height: orientation.h,
              rotated: orientation.rotated
            };
            
            packedItems.push(packedItem);
            
            // Remove the used space and create new spaces
            spaces.splice(spaceIndex, 1);
            
            // Create up to 3 new spaces from the remaining space
            const newSpaces: Space[] = [];
            
            // Right space
            if (space.x + orientation.l < space.x + space.length) {
              newSpaces.push({
                x: space.x + orientation.l,
                y: space.y,
                z: space.z,
                length: space.length - orientation.l,
                width: space.width,
                height: space.height
              });
            }
            
            // Back space
            if (space.y + orientation.w < space.y + space.width) {
              newSpaces.push({
                x: space.x,
                y: space.y + orientation.w,
                z: space.z,
                length: orientation.l,
                width: space.width - orientation.w,
                height: space.height
              });
            }
            
            // Top space
            if (space.z + orientation.h < space.z + space.height) {
              newSpaces.push({
                x: space.x,
                y: space.y,
                z: space.z + orientation.h,
                length: orientation.l,
                width: orientation.w,
                height: space.height - orientation.h
              });
            }
            
            // Add new spaces, sorted by volume (smallest first for better packing)
            newSpaces.sort((a, b) => (a.length * a.width * a.height) - (b.length * b.width * b.height));
            spaces.splice(spaceIndex, 0, ...newSpaces);
            
            itemPacked = true;
            console.log(`✅ Packed item ${item.name} (${orientation.l}x${orientation.w}x${orientation.h}${orientation.rotated ? ' rotated' : ''})`);
            break;
          }
        }
      }
      
      if (!itemPacked) {
        console.log(`❌ Could not pack item ${item.name} (${item.length}x${item.width}x${item.height})`);
        // Return failure if any item doesn't fit
        return {
          success: false,
          packedItems: [],
          usedVolume: 0,
          packingEfficiency: 0
        };
      }
    }
    
    // Calculate used volume and packing efficiency
    const usedVolume = packedItems.reduce((sum, packed) => 
      sum + (packed.length * packed.width * packed.height), 0
    );
    const boxVolume = box.length * box.width * box.height;
    const packingEfficiency = usedVolume / boxVolume;
    
    console.log(`✅ Successfully packed all ${packedItems.length} items. Used volume: ${usedVolume}/${boxVolume} (${(packingEfficiency * 100).toFixed(1)}%)`);
    
    return {
      success: true,
      packedItems,
      usedVolume,
      packingEfficiency
    };
  }

  // Legacy method for backward compatibility
  private checkItemsFit(items: Item[], box: Box): boolean {
    const result = this.enhanced3DBinPacking(items, box);
    return result.success;
  }

  // Test a specific scenario
  testScenario(scenario: {
    items: Item[];
    destination?: string;
    carrier?: string;
    serviceLevel?: string;
  }): CartonizationResult | null {
    return this.calculateOptimalBox(scenario.items);
  }
}

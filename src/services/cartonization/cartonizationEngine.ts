
import { Item, Box, CartonizationParameters, CartonizationResult, PackedItem, Space } from './types';
import { BinPackingAlgorithm } from './binPacking';
import { CartonizationUtils } from './utils';

// Re-export types for backward compatibility
export type { Item, Box, CartonizationParameters, CartonizationResult } from './types';

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
      const packingResult = BinPackingAlgorithm.enhanced3DBinPacking(items, box);
      const itemsFit = packingResult.success;
      const actualUtilization = packingResult.success ? 
        (packingResult.usedVolume / boxVolume) * 100 : 0;
      
      const dimensionalWeight = CartonizationUtils.calculateDimensionalWeight(box, this.parameters.dimensionalWeightFactor);
      
      console.log(`Box ${box.name} analysis:`, {
        basicUtilization: basicUtilization.toFixed(1),
        actualUtilization: actualUtilization.toFixed(1),
        itemsFit,
        usedVolume: packingResult.usedVolume,
        boxVolume,
        packedItems: packingResult.packedItems?.length || 0
      });
      
      // Calculate confidence using utility function
      const confidence = !itemsFit ? 0 : 
        CartonizationUtils.calculateConfidence(
          actualUtilization, 
          totalWeight, 
          box, 
          packingResult.packingEfficiency
        );
      
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

    // Apply business rules for selection using utility function
    let sortedBoxes = CartonizationUtils.sortBoxesByOptimization(fittingBoxes, this.parameters);
    
    if (this.parameters.optimizeForCost) {
      rulesApplied.push('Cost Optimization Rule');
    } else if (this.parameters.optimizeForSpace) {
      rulesApplied.push('Space Optimization Rule');
    } else {
      rulesApplied.push('Balanced Optimization Rule');
    }

    // Apply fill rate threshold rule - use as preference weight, not hard filter
    if (this.parameters.fillRateThreshold > 0) {
      rulesApplied.push(`Fill Rate Preference (${this.parameters.fillRateThreshold}%)`);
      
      // Set minimum viable threshold (60%) - below this, boxes are truly unusable
      const minViableThreshold = 60;
      const preferenceThreshold = this.parameters.fillRateThreshold;
      
      console.log(`Applying fill rate logic: preference=${preferenceThreshold}%, minViable=${minViableThreshold}%`);
      
      // Filter out only truly unusable boxes (below 60% utilization)
      sortedBoxes = sortedBoxes.filter(analysis => {
        const isViable = analysis.utilization >= minViableThreshold;
        const meetsPreference = analysis.utilization >= preferenceThreshold;
        
        console.log(`Box ${analysis.box.name}: utilization=${analysis.utilization.toFixed(1)}%, viable=${isViable}, meetsPreference=${meetsPreference}`);
        
        // Always keep viable boxes, but note preference
        return isViable;
      });
      
      // Re-sort with preference weighting - boxes meeting preference threshold get bonus points
      if (preferenceThreshold > minViableThreshold) {
        sortedBoxes = sortedBoxes.map(analysis => ({
          ...analysis,
          // Add bonus confidence for boxes that meet the preference threshold
          adjustedConfidence: analysis.confidence + (analysis.utilization >= preferenceThreshold ? 10 : 0)
        })).sort((a, b) => {
          // Sort by adjusted confidence first, then by original sorting criteria
          if (Math.abs(a.adjustedConfidence - b.adjustedConfidence) > 5) {
            return b.adjustedConfidence - a.adjustedConfidence;
          }
          // Fall back to utilization for similar confidence scores
          return b.utilization - a.utilization;
        });
      }
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

  // Legacy method for backward compatibility
  private checkItemsFit(items: Item[], box: Box): boolean {
    const result = BinPackingAlgorithm.enhanced3DBinPacking(items, box);
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

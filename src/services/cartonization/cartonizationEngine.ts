import { Item, Box, CartonizationParameters, CartonizationResult, PackedItem, Space, MultiPackageCartonizationResult } from './types';
import { BinPackingAlgorithm } from './binPacking';
import { CartonizationUtils } from './utils';
import { MultiPackageAlgorithm } from './multiPackageAlgorithm';

// Re-export types for backward compatibility
export type { Item, Box, CartonizationParameters, CartonizationResult } from './types';

export class CartonizationEngine {
  private boxes: Box[];
  private parameters: CartonizationParameters;

  constructor(boxes: Box[], parameters?: Partial<CartonizationParameters>) {
    this.boxes = boxes.filter(box => box.inStock > 0);
    this.parameters = {
      fillRateThreshold: 45, // More realistic threshold for practical packaging
      maxPackageWeight: 50,
      dimensionalWeightFactor: 139,
      packingEfficiency: 85,
      allowPartialFill: true,
      optimizeForCost: false,
      optimizeForSpace: true, // Prioritize smallest boxes
      ...parameters
    };
  }

  calculateOptimalBox(items: Item[], enableMultiPackage: boolean = false): CartonizationResult | null {
    const startTime = Date.now();
    
    if (!items.length || !this.boxes.length) {
      console.log('❌ No items or boxes available for cartonization');
      return null;
    }

    // Try single-box solution first
    const singleBoxResult = this.calculateSingleBoxSolution(items, startTime);
    
    // If single box works and multi-package is not enabled, return single box result
    if (singleBoxResult && !enableMultiPackage) {
      return singleBoxResult;
    }

    // If single box fails or multi-package is enabled, try multi-package solution
    if (enableMultiPackage || !singleBoxResult) {
      console.log('🚀 Attempting multi-package cartonization...');
      const multiPackageAlgorithm = new MultiPackageAlgorithm(this.boxes, this.parameters);
      const multiPackageResult = multiPackageAlgorithm.calculateMultiPackageCartonization(items);
      
      if (multiPackageResult) {
        // If we have both solutions, decide which to use
        if (singleBoxResult) {
          // Compare solutions - prefer single box if confidence is high enough
          if (singleBoxResult.confidence >= 75 && multiPackageResult.packages.length > 1) {
            console.log('✅ Using single-box solution due to high confidence');
            singleBoxResult.multiPackageResult = multiPackageResult;
            return singleBoxResult;
          } else {
            console.log('✅ Using multi-package solution');
            return this.convertMultiPackageToCartonizationResult(multiPackageResult, singleBoxResult);
          }
        } else {
          console.log('✅ Using multi-package solution (only viable option)');
          return this.convertMultiPackageToCartonizationResult(multiPackageResult);
        }
      }
    }

    return singleBoxResult;
  }

  private calculateSingleBoxSolution(items: Item[], startTime: number): CartonizationResult | null {

    const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    const totalVolume = items.reduce((sum, item) => 
      sum + (item.length * item.width * item.height * item.quantity), 0
    );

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 CARTONIZATION ANALYSIS START`);
    console.log(`${'='.repeat(80)}`);
    console.log(`📦 Items to pack: ${items.length} unique items`);
    items.forEach(item => {
      console.log(`   - ${item.name}: ${item.length}×${item.width}×${item.height} (${item.quantity}x) = ${(item.length * item.width * item.height * item.quantity).toFixed(0)} in³`);
    });
    console.log(`📊 Total weight: ${totalWeight.toFixed(2)} lbs`);
    console.log(`📊 Total volume: ${totalVolume.toFixed(0)} cubic inches`);
    console.log(`${'='.repeat(80)}\n`);

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

    // CRITICAL: Sort boxes by volume (smallest first) to prioritize smallest suitable box
    const sortedBoxes = suitableBoxes.sort((a, b) => {
      const volumeA = a.length * a.width * a.height;
      const volumeB = b.length * b.width * b.height;
      return volumeA - volumeB; // Smallest first
    });

    console.log(`📦 Testing ${sortedBoxes.length} boxes (smallest first):`);
    sortedBoxes.forEach(box => {
      const volume = box.length * box.width * box.height;
      console.log(`  - ${box.name}: ${box.length}×${box.width}×${box.height} (${volume} cubic inches)`);
    });

    const rulesApplied: string[] = [];
    
    // Calculate analysis for each suitable box with enhanced 3D packing (test in size order)
    const boxAnalysis = sortedBoxes.map(box => {
      const boxVolume = box.length * box.width * box.height;
      const basicUtilization = Math.min((totalVolume / boxVolume) * 100, 100);
      
      console.log(`\n🧪 Testing box: ${box.name} (${box.length}×${box.width}×${box.height})`);
      
      // Use enhanced 3D bin packing to check if items actually fit
      const packingResult = BinPackingAlgorithm.enhanced3DBinPacking(items, box);
      const itemsFit = packingResult.success;
      const actualUtilization = packingResult.success ? 
        (packingResult.usedVolume / boxVolume) * 100 : 0;
      
      if (!itemsFit) {
        console.log(`❌ 3D packing failed for ${box.name}: Items do not fit`);
      } else {
        console.log(`✅ ${box.name} - Utilization: ${actualUtilization.toFixed(1)}%`);
      }
      
      const dimensionalWeight = CartonizationUtils.calculateDimensionalWeight(box, this.parameters.dimensionalWeightFactor);
      
      // Calculate confidence with bonus for smaller boxes
      let confidence = !itemsFit ? 0 : 
        CartonizationUtils.calculateConfidence(
          actualUtilization, 
          totalWeight, 
          box, 
          packingResult.packingEfficiency
        );
      
      // Size bonus: smaller boxes get higher confidence when they fit
      if (itemsFit) {
        const sizeRank = sortedBoxes.indexOf(box);
        const sizeBonusMax = 15;
        const sizeBonus = Math.max(0, sizeBonusMax - (sizeRank * 3));
        confidence += sizeBonus;
        confidence = Math.min(confidence, 100);
        console.log(`📈 ${box.name} confidence: ${confidence}% (size bonus: +${sizeBonus})`);
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

    // Apply business rules for selection - prioritize smallest boxes first
    let optimizedBoxes = this.sortBoxesByOptimization(fittingBoxes);
    
    if (this.parameters.optimizeForCost) {
      rulesApplied.push('Cost Optimization Rule');
    } else if (this.parameters.optimizeForSpace) {
      rulesApplied.push('Highest Utilization Under 100% Rule');
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
      
      // Filter out only truly unusable boxes (below minimum threshold)
      optimizedBoxes = optimizedBoxes.filter(analysis => {
        const isViable = analysis.utilization >= minViableThreshold;
        const meetsPreference = analysis.utilization >= preferenceThreshold;
        
        console.log(`Box ${analysis.box.name}: utilization=${analysis.utilization.toFixed(1)}%, viable=${isViable}, meetsPreference=${meetsPreference}`);
        
        // Always keep viable boxes, but note preference
        return isViable;
      });
      
      // If no boxes meet threshold, use fallback logic for smallest fitting box
      if (optimizedBoxes.length === 0 && fittingBoxes.length > 0) {
        console.log("🔄 Using smallest fitting box as fallback");
        const fallback = fittingBoxes[0]; // Already sorted by size
        rulesApplied.push("Fallback: smallest fitting box");
        
        const fallbackConfidence = Math.max(fallback.confidence - 20, 60);
        console.log(`🎯 Fallback recommendation: ${fallback.box.name} with ${fallbackConfidence}% confidence`);
        
        return {
          recommendedBox: fallback.box,
          utilization: fallback.utilization,
          itemsFit: true,
          totalWeight,
          totalVolume,
          dimensionalWeight: fallback.dimensionalWeight,
          savings: 0,
          confidence: fallbackConfidence,
          alternatives: fittingBoxes.slice(1, 4).map(analysis => ({
            box: analysis.box,
            utilization: analysis.utilization,
            cost: analysis.cost,
            confidence: analysis.confidence
          })),
          rulesApplied: [...rulesApplied, "Fallback: smallest fitting box"],
          processingTime: Date.now() - startTime
        };
      }
    }

    if (!optimizedBoxes.length) {
      console.log('❌ No boxes meet fill rate threshold');
      return null;
    }

    const recommendedAnalysis = optimizedBoxes[0];
    
    console.log(`🎯 Recommended: ${recommendedAnalysis.box.name} with ${recommendedAnalysis.confidence}% confidence`);
    console.log(`📊 Final ranking:`);
    optimizedBoxes.slice(0, 3).forEach((analysis, index) => {
      console.log(`  ${index + 1}. ${analysis.box.name} - ${analysis.confidence}% confidence, ${analysis.utilization.toFixed(1)}% utilization`);
    });
    const alternatives = optimizedBoxes.slice(1, 4).map(analysis => ({
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
    rulesApplied.push('Smallest Box Priority Logic');

    console.log(`✅ Final recommendation: ${recommendedAnalysis.box.name} with ${recommendedAnalysis.confidence}% confidence`);

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

  // Modified sorting method that prioritizes highest utilization under 100%
  private sortBoxesByOptimization(analyses: any[]): any[] {
    // Filter out boxes with 100% or higher utilization AND unrealistically low utilization
    const viableBoxes = analyses.filter(analysis => {
      const isRealistic = analysis.utilization >= 30 && analysis.utilization < 100;
      if (!isRealistic) {
        console.log(`⚠️ Filtering out ${analysis.box.name}: utilization ${analysis.utilization.toFixed(1)}% is ${analysis.utilization < 30 ? 'too low (oversized box)' : 'too high'}`);
      }
      return isRealistic;
    });
    
    return viableBoxes.sort((a, b) => {
      // PRIMARY: Highest utilization under 100% (descending order)
      const utilizationDiff = b.utilization - a.utilization;
      if (Math.abs(utilizationDiff) > 2) { // 2% difference threshold
        return utilizationDiff; // Higher utilization first
      }

      // SECONDARY: Confidence (higher is better) for similar utilization
      if (Math.abs(a.confidence - b.confidence) > 5) {
        return b.confidence - a.confidence;
      }

      // TERTIARY: Size preference - prefer smaller boxes as tiebreaker
      const volumeA = a.box.length * a.box.width * a.box.height;
      const volumeB = b.box.length * b.box.width * b.box.height;
      return volumeA - volumeB; // Smaller volume first
    });
  }

  // Legacy method for backward compatibility
  private checkItemsFit(items: Item[], box: Box): boolean {
    const result = BinPackingAlgorithm.enhanced3DBinPacking(items, box);
    return result.success;
  }

  private convertMultiPackageToCartonizationResult(
    multiPackageResult: MultiPackageCartonizationResult,
    singleBoxResult?: CartonizationResult
  ): CartonizationResult {
    // Use the first package as the "recommended box" for backward compatibility
    const primaryPackage = multiPackageResult.packages[0];
    
    return {
      recommendedBox: primaryPackage.box,
      utilization: primaryPackage.utilization,
      itemsFit: true,
      totalWeight: multiPackageResult.totalWeight,
      totalVolume: multiPackageResult.totalVolume,
      dimensionalWeight: primaryPackage.dimensionalWeight,
      savings: singleBoxResult ? singleBoxResult.recommendedBox.cost - multiPackageResult.totalCost : 0,
      confidence: multiPackageResult.confidence,
      alternatives: multiPackageResult.packages.slice(1, 4).map(pkg => ({
        box: pkg.box,
        utilization: pkg.utilization,
        cost: pkg.box.cost,
        confidence: pkg.confidence
      })),
      rulesApplied: multiPackageResult.rulesApplied,
      processingTime: multiPackageResult.processingTime,
      multiPackageResult: multiPackageResult
    };
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

  // New method for explicit multi-package calculation
  calculateMultiPackageCartonization(
    items: Item[],
    optimizationObjective: 'minimize_packages' | 'minimize_cost' | 'balanced' = 'minimize_packages'
  ): MultiPackageCartonizationResult | null {
    const multiPackageAlgorithm = new MultiPackageAlgorithm(this.boxes, this.parameters);
    return multiPackageAlgorithm.calculateMultiPackageCartonization(items, optimizationObjective);
  }
}

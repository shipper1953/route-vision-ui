import { Item, Box, CartonizationParameters, CartonizationResult, DecisionExplanation, MultiPackageCartonizationResult, CARTONIZATION_ALGORITHM_VERSION } from './types';
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
      optimizeForSpace: false, // Prioritize utilization over size
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
    console.log(`🔍 CARTONIZATION v${CARTONIZATION_ALGORITHM_VERSION}`);
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

    console.log(`📦 Testing ${suitableBoxes.length} boxes for optimal utilization:`);

    const rulesApplied: string[] = [];
    const rejectedCandidates: DecisionExplanation['rejectedCandidates'] = [];
    
    // Calculate analysis for each suitable box - SIMPLE VOLUME-BASED UTILIZATION
    const boxAnalysis = suitableBoxes.map(box => {
      const boxVolume = box.length * box.width * box.height;
      
      // SIMPLE volume-based utilization calculation
      const volumeUtilization = (totalVolume / boxVolume) * 100;
      
      console.log(`\n🧪 Testing box: ${box.name} (${box.length}×${box.width}×${box.height}) = ${boxVolume} in³`);
      console.log(`   Volume utilization: ${volumeUtilization.toFixed(1)}%`);
      
      // Use 3D bin packing to verify items can physically fit
      const packingResult = BinPackingAlgorithm.enhanced3DBinPacking(items, box);
      const itemsFit = packingResult.success;
      
      if (!itemsFit) {
        console.log(`❌ 3D packing failed for ${box.name}: Items do not fit geometrically`);
        rejectedCandidates.push({
          id: box.id,
          name: box.name,
          reason: 'Items do not fit geometrically (3D packing failed)',
          score: 0
        });
      } else {
        console.log(`✅ ${box.name} - Items fit with ${volumeUtilization.toFixed(1)}% volume utilization`);
      }
      
      const dimensionalWeight = CartonizationUtils.calculateDimensionalWeight(box, this.parameters.dimensionalWeightFactor);
      
      const confidence = itemsFit
        ? CartonizationUtils.calculateConfidence(
            volumeUtilization,
            totalWeight,
            box,
            packingResult.packingEfficiency
          )
        : 0;
      
      if (itemsFit) {
        console.log(`📈 ${box.name} confidence: ${confidence.toFixed(1)}%`);
      }
      
      return {
        box,
        utilization: volumeUtilization,
        itemsFit,
        cost: box.cost,
        dimensionalWeight,
        confidence,
        volumeEfficiency: volumeUtilization,
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
    } else {
      rulesApplied.push('Smallest Fit Rule (deterministic tie-breakers)');
    }

    // Apply fill rate threshold as a soft preference (not a hard exclusion)
    if (this.parameters.fillRateThreshold > 0) {
      rulesApplied.push(`Fill Rate Preference (${this.parameters.fillRateThreshold}%)`);
      const preferenceThreshold = this.parameters.fillRateThreshold;
      

      console.log(`Applying fill rate preference: ${preferenceThreshold}%`);
      optimizedBoxes.sort((a, b) => {
        const aPref = a.utilization >= preferenceThreshold ? 1 : 0;
        const bPref = b.utilization >= preferenceThreshold ? 1 : 0;
        if (bPref !== aPref) return bPref - aPref;
        return b.utilization - a.utilization;
      });
    }

    if (!optimizedBoxes.length) {
      console.log('❌ No viable boxes remained after optimization');
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
    rulesApplied.push('Deterministic Smallest-Fit Tie-Breaking');

    console.log(`✅ Final recommendation: ${recommendedAnalysis.box.name} with ${recommendedAnalysis.confidence}% confidence`);

    const explanation: DecisionExplanation = {
      selectedBox: {
        id: recommendedAnalysis.box.id,
        name: recommendedAnalysis.box.name,
        score: recommendedAnalysis.confidence,
        volumeUtilization: recommendedAnalysis.utilization,
        dimensionalWeight: recommendedAnalysis.dimensionalWeight,
        cost: recommendedAnalysis.box.cost,
        outerVolume: recommendedAnalysis.box.length * recommendedAnalysis.box.width * recommendedAnalysis.box.height
      },
      rejectedCandidates: [
        ...rejectedCandidates,
        ...optimizedBoxes.slice(1, 8).map(analysis => ({
          id: analysis.box.id,
          name: analysis.box.name,
          reason: `Lower-ranked by deterministic tie-breakers vs ${recommendedAnalysis.box.name}`,
          score: analysis.confidence
        }))
      ],
      tieBreakersApplied: this.parameters.optimizeForCost
        ? ['primary: lowest_cost', 'tie1: lowest_dim_weight', 'tie2: smallest_outer_volume', 'tie3: highest_utilization']
        : ['primary: smallest_outer_volume', 'tie1: lowest_dim_weight', 'tie2: lowest_cost', 'tie3: highest_utilization'],
      reasonCode: this.parameters.optimizeForCost ? 'cost_optimized' : 'smallest_fit',
      algorithmVersion: CARTONIZATION_ALGORITHM_VERSION,
      optimizationObjective: this.parameters.optimizeForCost ? 'lowest_landed_cost' : 'smallest_fit'
    };

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
      processingTime,
      explanation
    };
  }

  // Sorting method focused on smallest-fit recommendation with deterministic tie-breakers
  private sortBoxesByOptimization(analyses: any[]): any[] {
    return analyses
      .filter(a => a.utilization > 0)
      .sort((a, b) => {
        const volumeA = a.box.length * a.box.width * a.box.height;
        const volumeB = b.box.length * b.box.width * b.box.height;

        if (this.parameters.optimizeForCost) {
          if (a.cost !== b.cost) return a.cost - b.cost;
          if (a.dimensionalWeight !== b.dimensionalWeight) return a.dimensionalWeight - b.dimensionalWeight;
          if (volumeA !== volumeB) return volumeA - volumeB;
          return b.utilization - a.utilization;
        }

        if (volumeA !== volumeB) return volumeA - volumeB;
        if (a.dimensionalWeight !== b.dimensionalWeight) return a.dimensionalWeight - b.dimensionalWeight;
        if (a.cost !== b.cost) return a.cost - b.cost;
        return b.utilization - a.utilization;
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
      explanation: {
        selectedBox: {
          id: primaryPackage.box.id,
          name: primaryPackage.box.name,
          score: multiPackageResult.confidence,
          volumeUtilization: primaryPackage.utilization,
          dimensionalWeight: primaryPackage.dimensionalWeight,
          cost: primaryPackage.box.cost,
          outerVolume: primaryPackage.box.length * primaryPackage.box.width * primaryPackage.box.height
        },
        rejectedCandidates: [],
        tieBreakersApplied: ['multi_package_split'],
        reasonCode: 'multi_package_required',
        algorithmVersion: CARTONIZATION_ALGORITHM_VERSION,
        optimizationObjective: 'multi_package_required' as const
      },
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
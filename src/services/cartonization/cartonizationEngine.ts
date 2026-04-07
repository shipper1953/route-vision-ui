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
      fillRateThreshold: 45,
      maxPackageWeight: 50,
      dimensionalWeightFactor: 139,
      packingEfficiency: 85,
      allowPartialFill: true,
      optimizeForCost: false,
      optimizeForSpace: false,
      ...parameters
    };
  }

  calculateOptimalBox(items: Item[], enableMultiPackage: boolean = false): CartonizationResult | null {
    const startTime = Date.now();
    
    if (!items.length || !this.boxes.length) {
      console.log('❌ No items or boxes available for cartonization');
      return null;
    }

    const singleBoxResult = this.calculateSingleBoxSolution(items, startTime);
    
    if (singleBoxResult && !enableMultiPackage) {
      return singleBoxResult;
    }

    if (enableMultiPackage || !singleBoxResult) {
      console.log('🚀 Attempting multi-package cartonization...');
      const multiPackageAlgorithm = new MultiPackageAlgorithm(this.boxes, this.parameters);
      const multiPackageResult = multiPackageAlgorithm.calculateMultiPackageCartonization(items);
      
      if (multiPackageResult) {
        if (singleBoxResult) {
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
    console.log(`📦 Items: ${items.length} unique, Weight: ${totalWeight.toFixed(2)} lbs, Volume: ${totalVolume.toFixed(0)} in³`);

    // Filter boxes that can handle the weight
    const suitableBoxes = this.boxes.filter(box => {
      const canHandleWeight = box.maxWeight >= totalWeight && totalWeight <= this.parameters.maxPackageWeight;
      return canHandleWeight;
    });
    
    if (!suitableBoxes.length) {
      console.log('❌ No suitable boxes found based on weight constraints');
      return null;
    }

    const rulesApplied: string[] = [];
    const rejectedCandidates: DecisionExplanation['rejectedCandidates'] = [];
    
    // Calculate analysis for each suitable box
    const boxAnalysis = suitableBoxes.map(box => {
      const boxVolume = box.length * box.width * box.height;
      const volumeUtilization = (totalVolume / boxVolume) * 100;
      
      const packingResult = BinPackingAlgorithm.enhanced3DBinPacking(items, box);
      const itemsFit = packingResult.success;
      
      if (!itemsFit) {
        rejectedCandidates.push({
          id: box.id,
          name: box.name,
          reason: 'Items do not fit geometrically (3D packing failed)',
          score: 0
        });
      }
      
      const dimensionalWeight = CartonizationUtils.calculateDimensionalWeight(box, this.parameters.dimensionalWeightFactor);
      const confidence = itemsFit ? Math.min(100, volumeUtilization * 1.01) : 0;
      
      return {
        box,
        utilization: volumeUtilization,
        itemsFit,
        cost: box.cost,
        dimensionalWeight,
        confidence,
        volumeEfficiency: volumeUtilization,
        packingResult,
        outerVolume: boxVolume
      };
    });

    const fittingBoxes = boxAnalysis.filter(analysis => analysis.itemsFit);
    
    if (!fittingBoxes.length) {
      console.log('❌ No boxes can fit all items with enhanced 3D packing');
      return null;
    }

    // Apply deterministic tie-breaking sort
    let optimizedBoxes = this.sortWithDeterministicTieBreakers(fittingBoxes);
    const tieBreakersApplied: string[] = [];
    
    if (this.parameters.optimizeForCost) {
      rulesApplied.push('Cost Optimization Rule');
      tieBreakersApplied.push('primary: lowest_cost');
    } else {
      rulesApplied.push('Highest Utilization Rule (up to 99.9%)');
      tieBreakersApplied.push('primary: highest_utilization');
    }
    tieBreakersApplied.push('tie1: smallest_outer_volume', 'tie2: lowest_dim_weight', 'tie3: lowest_cost');

    // Apply fill rate threshold
    if (this.parameters.fillRateThreshold > 0) {
      rulesApplied.push(`Fill Rate Preference (${this.parameters.fillRateThreshold}%)`);
      const minViableThreshold = 60;
      
      // Track rejections from fill rate
      optimizedBoxes.forEach(analysis => {
        if (analysis.utilization < minViableThreshold) {
          rejectedCandidates.push({
            id: analysis.box.id,
            name: analysis.box.name,
            reason: `Below minimum viable utilization (${analysis.utilization.toFixed(1)}% < ${minViableThreshold}%)`,
            score: analysis.confidence
          });
        }
      });
      
      optimizedBoxes = optimizedBoxes.filter(analysis => analysis.utilization >= minViableThreshold);
      
      if (optimizedBoxes.length === 0 && fittingBoxes.length > 0) {
        const fallback = fittingBoxes[0];
        rulesApplied.push("Fallback: smallest fitting box");
        const fallbackConfidence = Math.max(fallback.confidence - 20, 60);
        
        return {
          recommendedBox: fallback.box,
          utilization: fallback.utilization,
          itemsFit: true,
          totalWeight,
          totalVolume,
          dimensionalWeight: fallback.dimensionalWeight,
          savings: 0,
          confidence: fallbackConfidence,
          alternatives: fittingBoxes.slice(1, 4).map(a => ({
            box: a.box, utilization: a.utilization, cost: a.cost, confidence: a.confidence
          })),
          rulesApplied: [...rulesApplied, "Fallback: smallest fitting box"],
          processingTime: Date.now() - startTime,
          explanation: {
            selectedBox: {
              id: fallback.box.id,
              name: fallback.box.name,
              score: fallbackConfidence,
              volumeUtilization: fallback.utilization,
              dimensionalWeight: fallback.dimensionalWeight,
              cost: fallback.box.cost,
              outerVolume: fallback.outerVolume
            },
            rejectedCandidates,
            tieBreakersApplied,
            reasonCode: 'fallback_smallest_fit',
            algorithmVersion: CARTONIZATION_ALGORITHM_VERSION,
            optimizationObjective: this.parameters.optimizeForCost ? 'lowest_landed_cost' : 'smallest_fit'
          }
        };
      }
    }

    if (!optimizedBoxes.length) {
      return null;
    }

    const recommended = optimizedBoxes[0];
    
    // Build rejection reasons for non-selected fitting boxes
    optimizedBoxes.slice(1).forEach(a => {
      rejectedCandidates.push({
        id: a.box.id,
        name: a.box.name,
        reason: `Lower score than ${recommended.box.name} (${a.confidence.toFixed(1)}% vs ${recommended.confidence.toFixed(1)}%)`,
        score: a.confidence
      });
    });

    const alternatives = optimizedBoxes.slice(1, 4).map(a => ({
      box: a.box, utilization: a.utilization, cost: a.cost, confidence: a.confidence
    }));

    const largestBox = suitableBoxes.reduce((max, box) => 
      (box.length * box.width * box.height) > (max.length * max.width * max.height) ? box : max
    );
    const savings = Math.max(0, largestBox.cost - recommended.box.cost);
    const processingTime = Date.now() - startTime;

    rulesApplied.push('Enhanced 3D Bin Packing Algorithm');
    rulesApplied.push('Deterministic Tie-Breaking');
    rulesApplied.push('Dimensional Weight Calculation');

    // Determine reason code
    let reasonCode = 'optimal_fit';
    if (recommended.utilization >= 90) reasonCode = 'tight_fit';
    else if (recommended.utilization >= 70) reasonCode = 'good_fit';
    else if (recommended.utilization >= 50) reasonCode = 'acceptable_fit';
    else reasonCode = 'loose_fit';

    const explanation: DecisionExplanation = {
      selectedBox: {
        id: recommended.box.id,
        name: recommended.box.name,
        score: recommended.confidence,
        volumeUtilization: recommended.utilization,
        dimensionalWeight: recommended.dimensionalWeight,
        cost: recommended.box.cost,
        outerVolume: recommended.outerVolume
      },
      rejectedCandidates: rejectedCandidates.slice(0, 10),
      tieBreakersApplied,
      reasonCode,
      algorithmVersion: CARTONIZATION_ALGORITHM_VERSION,
      optimizationObjective: this.parameters.optimizeForCost ? 'lowest_landed_cost' : 'smallest_fit'
    };

    console.log(`✅ Decision: ${recommended.box.name} | Reason: ${reasonCode} | Confidence: ${recommended.confidence.toFixed(1)}%`);

    return {
      recommendedBox: recommended.box,
      utilization: recommended.utilization,
      itemsFit: true,
      totalWeight,
      totalVolume,
      dimensionalWeight: recommended.dimensionalWeight,
      savings,
      confidence: recommended.confidence,
      alternatives,
      rulesApplied,
      processingTime,
      explanation
    };
  }

  /**
   * Deterministic tie-breaking sort:
   * 1. Highest utilization (up to 99.9%)
   * 2. Smallest outer volume
   * 3. Lowest dimensional weight  
   * 4. Lowest box cost
   */
  private sortWithDeterministicTieBreakers(analyses: any[]): any[] {
    return analyses
      .filter(a => a.utilization > 0 && a.utilization <= 99.9)
      .filter(a => a.utilization >= this.parameters.fillRateThreshold)
      .sort((a, b) => {
        // Primary: highest utilization
        const utilizationDiff = b.utilization - a.utilization;
        if (Math.abs(utilizationDiff) > 0.5) return utilizationDiff;
        
        // Tie-breaker 1: smallest outer volume
        const volA = a.box.length * a.box.width * a.box.height;
        const volB = b.box.length * b.box.width * b.box.height;
        if (volA !== volB) return volA - volB;
        
        // Tie-breaker 2: lowest dimensional weight
        if (a.dimensionalWeight !== b.dimensionalWeight) return a.dimensionalWeight - b.dimensionalWeight;
        
        // Tie-breaker 3: lowest cost
        return a.cost - b.cost;
      });
  }

  private convertMultiPackageToCartonizationResult(
    multiPackageResult: MultiPackageCartonizationResult,
    singleBoxResult?: CartonizationResult
  ): CartonizationResult {
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
        optimizationObjective: multiPackageResult.optimizationObjective
      },
      multiPackageResult
    };
  }

  // Legacy compatibility
  private checkItemsFit(items: Item[], box: Box): boolean {
    const result = BinPackingAlgorithm.enhanced3DBinPacking(items, box);
    return result.success;
  }

  testScenario(scenario: { items: Item[]; destination?: string; carrier?: string; serviceLevel?: string; }): CartonizationResult | null {
    return this.calculateOptimalBox(scenario.items);
  }

  calculateMultiPackageCartonization(
    items: Item[],
    optimizationObjective: 'minimize_packages' | 'minimize_cost' | 'balanced' = 'minimize_packages'
  ): MultiPackageCartonizationResult | null {
    const multiPackageAlgorithm = new MultiPackageAlgorithm(this.boxes, this.parameters);
    return multiPackageAlgorithm.calculateMultiPackageCartonization(items, optimizationObjective);
  }
}

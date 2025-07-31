import { Item, Box, PackageRecommendation, MultiPackageCartonizationResult, CartonizationParameters } from './types';
import { BinPackingAlgorithm } from './binPacking';
import { CartonizationUtils } from './utils';

export class MultiPackageAlgorithm {
  private boxes: Box[];
  private parameters: CartonizationParameters;

  constructor(boxes: Box[], parameters: CartonizationParameters) {
    this.boxes = boxes.filter(box => box.inStock > 0);
    this.parameters = parameters;
  }

  calculateMultiPackageCartonization(
    items: Item[],
    optimizationObjective: 'minimize_packages' | 'minimize_cost' | 'balanced' = 'minimize_packages'
  ): MultiPackageCartonizationResult | null {
    const startTime = Date.now();
    
    if (!items.length || !this.boxes.length) {
      return null;
    }

    console.log(`🚀 Starting multi-package cartonization for ${items.length} items`);
    console.log(`📦 Optimization objective: ${optimizationObjective}`);

    // Try different splitting strategies
    const strategies = ['weight', 'volume', 'category', 'fragility', 'hybrid'] as const;
    const results: MultiPackageCartonizationResult[] = [];

    for (const strategy of strategies) {
      const result = this.calculateWithStrategy(items, strategy, optimizationObjective, startTime);
      if (result) {
        results.push(result);
      }
    }

    if (!results.length) {
      console.log('❌ No viable multi-package solutions found');
      return null;
    }

    // Select best result based on optimization objective
    const bestResult = this.selectBestResult(results, optimizationObjective);
    bestResult.alternatives = results.filter(r => r !== bestResult).slice(0, 3);

    console.log(`✅ Multi-package solution: ${bestResult.totalPackages} packages using ${bestResult.splittingStrategy} strategy`);
    
    return bestResult;
  }

  private calculateWithStrategy(
    items: Item[],
    strategy: 'weight' | 'volume' | 'category' | 'fragility' | 'hybrid',
    optimizationObjective: 'minimize_packages' | 'minimize_cost' | 'balanced',
    startTime: number
  ): MultiPackageCartonizationResult | null {
    console.log(`🧪 Testing ${strategy} splitting strategy`);

    // Split items into groups based on strategy
    const itemGroups = this.splitItemsByStrategy(items, strategy);
    
    if (!itemGroups.length) {
      return null;
    }

    const packages: PackageRecommendation[] = [];
    const rulesApplied: string[] = [`${strategy.charAt(0).toUpperCase() + strategy.slice(1)} Splitting Strategy`];

    // Find optimal box for each group
    for (let groupIndex = 0; groupIndex < itemGroups.length; groupIndex++) {
      const group = itemGroups[groupIndex];
      const packageResult = this.findOptimalBoxForGroup(group, groupIndex + 1);
      
      if (!packageResult) {
        // If any group can't be packed, try splitting it further
        const subGroups = this.splitGroupFurther(group);
        let allSubGroupsPacked = true;
        
        for (const subGroup of subGroups) {
          const subPackageResult = this.findOptimalBoxForGroup(subGroup, packages.length + 1);
          if (subPackageResult) {
            packages.push(subPackageResult);
          } else {
            allSubGroupsPacked = false;
            break;
          }
        }
        
        if (!allSubGroupsPacked) {
          console.log(`❌ Strategy ${strategy} failed: Cannot pack group ${groupIndex + 1}`);
          return null;
        }
        
        rulesApplied.push('Automatic Group Subdivision');
      } else {
        packages.push(packageResult);
      }
    }

    if (!packages.length) {
      return null;
    }

    // Calculate overall metrics
    const totalWeight = packages.reduce((sum, pkg) => sum + pkg.packageWeight, 0);
    const totalVolume = packages.reduce((sum, pkg) => sum + pkg.packageVolume, 0);
    const totalCost = packages.reduce((sum, pkg) => sum + pkg.box.cost, 0);
    const avgConfidence = packages.reduce((sum, pkg) => sum + pkg.confidence, 0) / packages.length;

    // Apply optimization objective rules
    if (optimizationObjective === 'minimize_packages') {
      rulesApplied.push('Minimize Package Count Objective');
    } else if (optimizationObjective === 'minimize_cost') {
      rulesApplied.push('Minimize Total Cost Objective');
    } else {
      rulesApplied.push('Balanced Optimization Objective');
    }

    return {
      packages,
      totalPackages: packages.length,
      totalWeight,
      totalVolume,
      totalCost,
      splittingStrategy: strategy,
      optimizationObjective,
      confidence: Math.round(avgConfidence),
      alternatives: [],
      rulesApplied,
      processingTime: Date.now() - startTime
    };
  }

  private splitItemsByStrategy(items: Item[], strategy: string): Item[][] {
    switch (strategy) {
      case 'weight':
        return this.splitByWeight(items);
      case 'volume':
        return this.splitByVolume(items);
      case 'category':
        return this.splitByCategory(items);
      case 'fragility':
        return this.splitByFragility(items);
      case 'hybrid':
        return this.splitByHybrid(items);
      default:
        return [items];
    }
  }

  private splitByWeight(items: Item[]): Item[][] {
    const maxWeight = this.parameters.maxPackageWeight;
    const groups: Item[][] = [];
    let currentGroup: Item[] = [];
    let currentWeight = 0;

    // Sort by weight (heaviest first for better distribution)
    const sortedItems = [...items].sort((a, b) => (b.weight * b.quantity) - (a.weight * a.quantity));

    for (const item of sortedItems) {
      const itemWeight = item.weight * item.quantity;
      
      if (currentWeight + itemWeight <= maxWeight) {
        currentGroup.push(item);
        currentWeight += itemWeight;
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [];
          currentWeight = 0;
        }
        
        // Handle oversized items by splitting quantity
        if (itemWeight > maxWeight && item.quantity > 1) {
          const maxQtyPerPackage = Math.floor(maxWeight / item.weight);
          let remainingQty = item.quantity;
          
          while (remainingQty > 0) {
            const qtyForThisPackage = Math.min(maxQtyPerPackage, remainingQty);
            groups.push([{ ...item, quantity: qtyForThisPackage }]);
            remainingQty -= qtyForThisPackage;
          }
        } else {
          currentGroup.push(item);
          currentWeight = itemWeight;
        }
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  private splitByVolume(items: Item[]): Item[][] {
    // Sort boxes by volume to get target package sizes
    const sortedBoxes = [...this.boxes].sort((a, b) => 
      (a.length * a.width * a.height) - (b.length * b.width * b.height)
    );
    
    const targetVolume = sortedBoxes[Math.floor(sortedBoxes.length / 2)]?.length * 
                        sortedBoxes[Math.floor(sortedBoxes.length / 2)]?.width * 
                        sortedBoxes[Math.floor(sortedBoxes.length / 2)]?.height || 1000;

    const groups: Item[][] = [];
    let currentGroup: Item[] = [];
    let currentVolume = 0;

    for (const item of items) {
      const itemVolume = item.length * item.width * item.height * item.quantity;
      
      if (currentVolume + itemVolume <= targetVolume * 0.8) { // 80% fill target
        currentGroup.push(item);
        currentVolume += itemVolume;
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [];
          currentVolume = 0;
        }
        currentGroup.push(item);
        currentVolume = itemVolume;
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  private splitByCategory(items: Item[]): Item[][] {
    const categoryGroups = new Map<string, Item[]>();
    
    for (const item of items) {
      const category = item.category || 'general';
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, []);
      }
      categoryGroups.get(category)!.push(item);
    }

    return Array.from(categoryGroups.values());
  }

  private splitByFragility(items: Item[]): Item[][] {
    const fragilityGroups = new Map<string, Item[]>();
    
    for (const item of items) {
      const fragility = item.fragility || 'low';
      if (!fragilityGroups.has(fragility)) {
        fragilityGroups.set(fragility, []);
      }
      fragilityGroups.get(fragility)!.push(item);
    }

    return Array.from(fragilityGroups.values());
  }

  private splitByHybrid(items: Item[]): Item[][] {
    // Combine weight and fragility constraints
    const highFragilityItems = items.filter(item => item.fragility === 'high');
    const otherItems = items.filter(item => item.fragility !== 'high');

    const groups: Item[][] = [];

    // High fragility items get their own packages (with weight limits)
    if (highFragilityItems.length > 0) {
      groups.push(...this.splitByWeight(highFragilityItems));
    }

    // Other items use weight-based splitting
    if (otherItems.length > 0) {
      groups.push(...this.splitByWeight(otherItems));
    }

    return groups;
  }

  private splitGroupFurther(group: Item[]): Item[][] {
    // Split large groups into smaller ones
    if (group.length <= 1) {
      return [group];
    }

    const midpoint = Math.ceil(group.length / 2);
    return [
      group.slice(0, midpoint),
      group.slice(midpoint)
    ];
  }

  private findOptimalBoxForGroup(items: Item[], packageNumber: number): PackageRecommendation | null {
    const groupWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    const groupVolume = items.reduce((sum, item) => 
      sum + (item.length * item.width * item.height * item.quantity), 0
    );

    console.log(`📦 Package ${packageNumber}: ${items.length} items, ${groupWeight} lbs, ${groupVolume} cubic inches`);

    // Filter boxes that can handle the weight
    const suitableBoxes = this.boxes
      .filter(box => box.maxWeight >= groupWeight)
      .sort((a, b) => (a.length * a.width * a.height) - (b.length * b.width * b.height));

    for (const box of suitableBoxes) {
      const packingResult = BinPackingAlgorithm.enhanced3DBinPacking(items, box);
      
      if (packingResult.success) {
        const boxVolume = box.length * box.width * box.height;
        const utilization = (packingResult.usedVolume / boxVolume) * 100;
        const dimensionalWeight = CartonizationUtils.calculateDimensionalWeight(box, this.parameters.dimensionalWeightFactor);
        const confidence = CartonizationUtils.calculateConfidence(utilization, groupWeight, box, packingResult.packingEfficiency);

        console.log(`✅ Package ${packageNumber}: ${box.name} (${utilization.toFixed(1)}% utilization)`);

        return {
          box,
          assignedItems: items,
          utilization,
          packageWeight: groupWeight,
          packageVolume: groupVolume,
          dimensionalWeight,
          confidence,
          packingResult
        };
      }
    }

    console.log(`❌ Package ${packageNumber}: No suitable box found`);
    return null;
  }

  private selectBestResult(
    results: MultiPackageCartonizationResult[],
    optimizationObjective: 'minimize_packages' | 'minimize_cost' | 'balanced'
  ): MultiPackageCartonizationResult {
    if (results.length === 1) {
      return results[0];
    }

    return results.sort((a, b) => {
      if (optimizationObjective === 'minimize_packages') {
        if (a.totalPackages !== b.totalPackages) {
          return a.totalPackages - b.totalPackages; // Fewer packages first
        }
        return a.totalCost - b.totalCost; // Then by cost
      }
      
      if (optimizationObjective === 'minimize_cost') {
        if (Math.abs(a.totalCost - b.totalCost) > 5) {
          return a.totalCost - b.totalCost; // Lower cost first
        }
        return a.totalPackages - b.totalPackages; // Then by package count
      }
      
      // Balanced approach
      const aScore = (a.confidence * 0.4) + ((10 - a.totalPackages) * 5) + ((100 - a.totalCost) * 0.3);
      const bScore = (b.confidence * 0.4) + ((10 - b.totalPackages) * 5) + ((100 - b.totalCost) * 0.3);
      return bScore - aScore;
    })[0];
  }
}

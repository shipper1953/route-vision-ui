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
  sku?: string;
  length: number;
  width: number;
  height: number;
  maxWeight: number;
  cost: number;
  inStock: number;
  minStock: number;
  maxStock: number;
  type: 'box' | 'poly_bag' | 'envelope' | 'tube' | 'custom';
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

export interface PackageRecommendation {
  box: Box;
  assignedItems: Item[];
  utilization: number;
  packageWeight: number;
  packageVolume: number;
  dimensionalWeight: number;
  confidence: number;
  packingResult: PackingResult;
}

export interface MultiPackageCartonizationResult {
  packages: PackageRecommendation[];
  totalPackages: number;
  totalWeight: number;
  totalVolume: number;
  totalCost: number;
  splittingStrategy: 'weight' | 'volume' | 'category' | 'fragility' | 'hybrid';
  optimizationObjective: 'minimize_packages' | 'minimize_cost' | 'balanced';
  confidence: number;
  alternatives: MultiPackageCartonizationResult[];
  rulesApplied: string[];
  processingTime: number;
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
  explanation?: DecisionExplanation;
  // Add multi-package support to existing result
  multiPackageResult?: MultiPackageCartonizationResult;
}

export interface DecisionExplanation {
  selectedBox: {
    id: string;
    name: string;
    score: number;
    volumeUtilization: number;
    dimensionalWeight: number;
    cost: number;
    outerVolume: number;
  };
  rejectedCandidates: Array<{
    id: string;
    name: string;
    reason: string;
    score: number;
  }>;
  tieBreakersApplied: string[];
  reasonCode: string;
  algorithmVersion: string;
  policyVersion?: string;
  optimizationObjective:
    | 'smallest_fit'
    | 'lowest_landed_cost'
    | 'multi_package_required'
    | 'balanced'
    | 'minimize_packages'
    | 'minimize_cost';
}

export const CARTONIZATION_ALGORITHM_VERSION = '2.1.0';

export interface PackedItem {
  item: Item;
  x: number;
  y: number;
  z: number;
  length: number;
  width: number;
  height: number;
  rotated: boolean;
}

export interface Space {
  x: number;
  y: number;
  z: number;
  length: number;
  width: number;
  height: number;
}

export interface PackingResult {
  success: boolean;
  packedItems: PackedItem[];
  usedVolume: number;
  packingEfficiency: number;
}

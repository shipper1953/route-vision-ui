export const CARTONIZATION_ALGORITHM_VERSION = '2.0.0';

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

/** Explains why a particular box was chosen or rejected */
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
  optimizationObjective: string;
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
  // Decision explanation for audit trail
  explanation?: DecisionExplanation;
  // Multi-package support
  multiPackageResult?: MultiPackageCartonizationResult;
}

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

/** Ranked rate recommendation categories */
export interface RankedRateRecommendations {
  cheapest: RankedRate | null;
  fastest: RankedRate | null;
  bestValue: RankedRate | null;
  recommended: RankedRate | null;
  recommendedReasonCode: string;
}

export interface RankedRate {
  rateId: string;
  carrier: string;
  service: string;
  rate: number;
  estimatedDays: number | null;
  provider: string;
  category: 'cheapest' | 'fastest' | 'best_value';
  score: number;
}

/** Provider health status for degraded mode */
export interface ProviderStatus {
  provider: string;
  available: boolean;
  error?: string;
  latencyMs?: number;
}

export interface RateDecisionMetadata {
  degradedMode: boolean;
  degradedProviders: string[];
  providerStatuses: ProviderStatus[];
  algorithmVersion: string;
  policyVersionId?: string;
  rankedRecommendations: RankedRateRecommendations;
  totalRatesReturned: number;
  processingTimeMs: number;
}

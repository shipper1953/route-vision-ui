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

export interface Item {
  id: string;
  sku: string;
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  category: string;
  isActive: boolean;
  dimensionsUpdatedAt?: string;
}

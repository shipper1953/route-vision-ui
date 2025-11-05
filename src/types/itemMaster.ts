
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
  customerId?: string;
  
  // Legacy numeric IDs (for REST API compatibility)
  shopifyProductId?: string;
  shopifyVariantId?: string;
  
  // Global IDs (for GraphQL)
  shopifyProductGid?: string;
  shopifyVariantGid?: string;
}

// Fulfillment tracking types

export interface SelectedItem {
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
}

export interface FulfillmentData {
  items_total: number;
  items_shipped: number;
  fulfillment_percentage: number;
  fulfillment_status: 'unfulfilled' | 'partially_fulfilled' | 'fulfilled';
}

export interface PackageInfo {
  items: SelectedItem[];
  boxName?: string;
  boxDimensions?: {
    length: number;
    width: number;
    height: number;
  };
  weight?: number;
  legacy?: boolean;
  note?: string;
}


// Order data type definitions

export interface OrderAddress {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface ParcelInfo {
  length: number;
  width: number;
  height: number;
  weight: number;
}

export interface ShipmentInfo {
  id: string;
  carrier: string;
  service: string;
  trackingNumber: string;
  trackingUrl: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  labelUrl?: string;
  cost?: number | string;
}

export interface OrderItem {
  itemId: string;
  quantity: number;
  unitPrice?: number;
  name?: string;
  sku?: string;
  description?: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
}

export interface OrderData {
  id: string;
  orderId?: string; // Shopify order number or external order ID
  customerName: string;
  customerCompany?: string;
  customerPhone?: string;
  customerEmail?: string;
  orderDate: string;
  requiredDeliveryDate: string;
  status: string;
  items: OrderItem[] | number; // Can be array of items or just a count
  value: string;
  shippingAddress: OrderAddress;
  parcelInfo?: ParcelInfo; // This would come from the Qboid scanning system
  shipment?: ShipmentInfo; // New field to link shipment details
  recommendedBox?: {
    id: string;
    name: string;
    length: number;
    width: number;
    height: number;
    maxWeight: number;
    cost: number;
    inStock: number;
    type: string;
  };
  packageWeight?: {
    itemsWeight: number;
    boxWeight: number;
    totalWeight: number;
  };
}

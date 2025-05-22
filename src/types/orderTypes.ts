
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
}

export interface OrderData {
  id: string;
  customerName: string;
  customerCompany?: string;
  customerPhone?: string;
  customerEmail?: string;
  orderDate: string;
  requiredDeliveryDate: string;
  status: string;
  items: number;
  value: string;
  shippingAddress: OrderAddress;
  parcelInfo?: ParcelInfo; // This would come from the Qboid scanning system
  shipment?: ShipmentInfo; // New field to link shipment details
}

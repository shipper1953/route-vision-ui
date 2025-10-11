import { Box } from "@/services/cartonization/cartonizationEngine";

export interface OrderForShipping {
  id: string;
  customerName: string;
  items: any[];
  value: number;
  shippingAddress: any;
  recommendedBox: Box;
  recommendedService?: string;
  requiredDeliveryDate?: string;
}

export interface BoxShippingGroup {
  box: Box;
  orders: OrderForShipping[];
}

export interface ShippingResult {
  orderId: string;
  success: boolean;
  trackingNumber?: string;
  labelUrl?: string;
  cost?: number;
  error?: string;
}

export interface OrderWithRates extends OrderForShipping {
  rates: Array<{
    id: string;
    carrier: string;
    service: string;
    rate: string;
    delivery_days?: number;
    delivery_date?: string;
    shipment_id?: string;
  }>;
  selectedRateId?: string;
  packageWeight?: {
    itemsWeight: number;
    boxWeight: number;
    totalWeight: number;
  };
}
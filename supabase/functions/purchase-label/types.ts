
export interface PurchaseLabelRequest {
  shipmentId: string;
  rateId: string;
  orderId?: string | null;
}

export interface ShipmentData {
  easypost_id: string;
  tracking_number: string;
  carrier: string;
  service: string;
  status: string;
  label_url: string;
  tracking_url: string;
  cost: number;
  weight: string;
  package_dimensions: string;
  package_weights: string;
  created_at: string;
}

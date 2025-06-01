
// Types for EasyPost API
export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  company?: string;
  name?: string;
  phone?: string;
  email?: string;
}

export interface Parcel {
  length: number;
  width: number;
  height: number;
  weight: number; // in ounces
}

export interface CustomsInfo {
  contents_type: string;
  contents_explanation?: string;
  customs_items?: CustomsItem[];
}

export interface CustomsItem {
  description: string;
  quantity: number;
  value: number;
  weight: number;
  hs_tariff_number?: string;
  origin_country: string;
}

export interface ShipmentRequest {
  from_address: Address;
  to_address: Address;
  parcel: Parcel;
  customs_info?: CustomsInfo;
  options?: Record<string, any>;
}

export interface Rate {
  id: string;
  carrier: string;
  service: string;
  rate: string;
  delivery_days: number;
  delivery_date: string | null;
  delivery_accuracy?: string;
  est_delivery_days?: number;
}

export interface SmartRate extends Rate {
  time_in_transit: number;
  delivery_date_guaranteed: boolean;
  delivery_accuracy?: 'percentile_50' | 'percentile_75' | 'percentile_85' | 'percentile_90' | 'percentile_95' | 'percentile_97' | 'percentile_99';
}

export interface ShipmentResponse {
  id: string;
  object: string;
  status: string;
  tracking_code?: string;
  rates: Rate[];
  smartRates?: SmartRate[];
  selected_rate: Rate | null;
}

export interface AddressVerificationResult {
  id: string; 
  address: Address;
  verifications?: {
    delivery: {
      success: boolean;
      errors: string[];
    }
  };
}

export interface ShippingRule {
  id: string;
  company_id: string;
  name: string;
  priority: number;
  conditions: {
    carriers_allow?: string[];
    carriers_block?: string[];
    services_allow?: string[];
    services_block?: string[];
    max_transit_days?: number;
    min_delivery_confidence?: number; // SmartRate percentile
    order_value_min?: number;
    order_value_max?: number;
  };
  actions: {
    boost_carriers?: Record<string, number>; // carrier -> boost weight
    boost_services?: Record<string, number>; // service -> boost weight
    prefer_provider?: 'easypost' | 'shippo';
  };
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyShippingPrefs {
  id: string;
  company_id: string;
  sla_preference: 'fastest' | 'cheapest' | 'balanced';
  delivery_confidence: number; // e.g., 90
  carrier_whitelist?: string[] | null;
  service_blacklist?: string[] | null;
  max_transit_days?: number | null;
  optimize_objective: 'minimize_packages' | 'minimize_cost' | 'balanced';
  created_at?: string;
  updated_at?: string;
}

export interface NormalizedRate {
  id: string;
  provider: 'easypost' | 'shippo';
  carrier: string;
  service: string;
  rate: number;
  currency?: string;
  delivery_days?: number | null;
  delivery_date?: string | null;
  speed_rank: number; // lower is faster
  normalized_service: 'ground' | '3_day' | '2_day' | 'overnight' | 'standard' | 'unknown';
  original: any;
}

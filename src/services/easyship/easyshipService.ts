import { ShipmentRequest } from "@/types/easypost";
import { supabase } from "@/integrations/supabase/client";

export interface EasyshipRate {
  object_id: string;
  rate_id: string;
  courier_id: string;
  courier_name: string;
  courier_logo_url?: string;
  service_name: string;
  total_charge: number;
  currency: string;
  min_delivery_time?: number;
  max_delivery_time?: number;
  delivery_days?: number;
  tracking_rating?: number;
  ddp_handling_fee?: number;
  raw?: any;
}

export interface EasyshipShipmentResponse {
  object_id: string;
  rates: EasyshipRate[];
  raw?: any;
  shipmentPayload?: any;
}

export class EasyshipService {
  async createShipment(shipmentData: ShipmentRequest): Promise<EasyshipShipmentResponse> {
    console.log('🚀 Creating Easyship shipment via Edge Function');

    const { data, error } = await supabase.functions.invoke<EasyshipShipmentResponse>(
      'create-easyship-shipment',
      { body: { shipmentData } }
    );

    if (error) {
      console.error('🔴 Easyship Edge Function error:', error);
      throw new Error(error.message || 'Failed to create Easyship shipment');
    }

    if (!data) {
      throw new Error('No response from Easyship service');
    }

    console.log(`✅ Easyship returned ${data.rates?.length || 0} rates`);
    return data;
  }
}

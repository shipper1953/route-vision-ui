import { ShipmentRequest } from "@/types/easypost";
import { supabase } from "@/integrations/supabase/client";

export interface ShippoRate {
  object_id: string;
  object_owner: string;
  carrier: string;
  service: string;
  amount: string;
  currency: string;
  delivery_days?: number;
  estimated_days?: number;
  zone?: string;
  duration_terms?: string;
  provider?: string;
}

export interface ShippoShipmentResponse {
  object_id: string;
  object_owner: string;
  rates: ShippoRate[];
  carrier_accounts?: string[];
  status: string;
  address_from: any;
  address_to: any;
  parcels: any[];
}

export class ShippoService {
  private apiKey: string;
  private baseUrl = "https://api.goshippo.com";
  private useEdgeFunctions: boolean;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.useEdgeFunctions = !apiKey;
  }

  async createShipment(shipmentData: ShipmentRequest): Promise<ShippoShipmentResponse> {
    try {
      console.log('Creating Shippo shipment with data:', shipmentData);

      if (this.useEdgeFunctions) {
        return this.createShipmentViaEdgeFunction(shipmentData);
      }

      return this.createShipmentDirectly(shipmentData);
    } catch (error) {
      console.error('Error creating Shippo shipment:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          throw new Error('Shippo authentication failed. Please check API key configuration.');
        } else if (error.message.includes('422')) {
          throw new Error('Invalid Shippo shipment data. Please check your addresses and package dimensions.');
        } else if (error.message.includes('404')) {
          throw new Error('Shippo service unavailable. Please try again later.');
        }
      }
      
      throw error;
    }
  }

  private async createShipmentViaEdgeFunction(shipmentData: ShipmentRequest): Promise<ShippoShipmentResponse> {
    console.log('Using Edge Function for Shippo shipment creation');

    const { data, error } = await supabase.functions.invoke<ShippoShipmentResponse>('create-shippo-shipment', {
      body: { shipmentData }
    });

    if (error) {
      console.error('Shippo Edge Function error:', error);
      
      if (error.message.includes('Shippo API key not configured')) {
        throw new Error('Shippo configuration issue. The SHIPPO_API_KEY secret is not configured.');
      } else if (error.message.includes('Invalid shipment data')) {
        throw new Error('Please verify your shipping addresses and package dimensions for Shippo.');
      }
      
      throw new Error(error.message || 'Failed to create Shippo shipment');
    }

    if (!data) {
      throw new Error('No response from Shippo service');
    }

    console.log('Shippo shipment created via Edge Function:', data.object_id);
    console.log('Shippo rates returned:', data.rates?.length || 0);

    if (!data.rates?.length) {
      console.warn('No Shippo rates available for this shipment');
    }

    return data;
  }

  private async createShipmentDirectly(shipmentData: ShipmentRequest): Promise<ShippoShipmentResponse> {
    // Convert EasyPost shipment format to Shippo format
    const shippoData = {
      address_from: {
        name: shipmentData.from_address.name,
        company: shipmentData.from_address.company || '',
        street1: shipmentData.from_address.street1,
        street2: shipmentData.from_address.street2 || '',
        city: shipmentData.from_address.city,
        state: shipmentData.from_address.state,
        zip: shipmentData.from_address.zip,
        country: shipmentData.from_address.country || 'US',
        phone: shipmentData.from_address.phone || '',
        email: shipmentData.from_address.email || ''
      },
      address_to: {
        name: shipmentData.to_address.name,
        company: shipmentData.to_address.company || '',
        street1: shipmentData.to_address.street1,
        street2: shipmentData.to_address.street2 || '',
        city: shipmentData.to_address.city,
        state: shipmentData.to_address.state,
        zip: shipmentData.to_address.zip,
        country: shipmentData.to_address.country || 'US',
        phone: shipmentData.to_address.phone || '',
        email: shipmentData.to_address.email || ''
      },
      parcels: [{
        length: shipmentData.parcel.length,
        width: shipmentData.parcel.width,
        height: shipmentData.parcel.height,
        distance_unit: 'in',
        weight: shipmentData.parcel.weight,
        mass_unit: 'lb'
      }],
      async: false // Get rates immediately
    };

    const response = await fetch(`${this.baseUrl}/shipments/`, {
      method: 'POST',
      headers: {
        'Authorization': `ShippoToken ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shippoData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Shippo API error:', errorData);
      
      if (response.status === 401) {
        throw new Error('Invalid Shippo API key. Please check your configuration.');
      } else if (response.status === 422) {
        throw new Error('Invalid Shippo shipment data. Please check your addresses and package dimensions.');
      }
      
      throw new Error(errorData.detail || 'Failed to create Shippo shipment');
    }

    const shipmentResponse = await response.json();

    console.log('Shippo shipment created successfully:');
    console.log('- Shippo rates:', shipmentResponse.rates ? shipmentResponse.rates.length : 0);

    return shipmentResponse;
  }
}
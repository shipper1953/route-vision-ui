
import { ShipmentRequest, ShipmentResponse } from "@/types/easypost";
import { supabase } from "@/integrations/supabase/client";

type EasyPostEdgeResponse = {
  id: string;
  rates?: any[];
  smartRates?: any[];
};

export class ShipmentService {
  private apiKey: string;
  private baseUrl = "https://api.easypost.com/v2";
  private useEdgeFunctions: boolean;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.useEdgeFunctions = !apiKey;
  }

  async createShipment(shipmentData: ShipmentRequest): Promise<ShipmentResponse> {
    try {
      console.log('Creating shipment with data:', shipmentData);

      if (!shipmentData.options) {
        shipmentData.options = {};
      }

      // Use a more reliable SmartRate accuracy level
      shipmentData.options.smartrate_accuracy = shipmentData.options.smartrate_accuracy || 'percentile_75';

      console.log('SmartRate configuration:', {
        smartrate_accuracy: shipmentData.options.smartrate_accuracy
      });

      if (this.useEdgeFunctions) {
        return this.createShipmentViaEdgeFunction(shipmentData);
      }

      return this.createShipmentDirectly(shipmentData);
    } catch (error) {
      console.error('Error creating shipment:', error);
      
      // Provide more helpful error messages
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          throw new Error('Authentication failed. Please log out and log back in.');
        } else if (error.message.includes('422')) {
          throw new Error('Invalid shipment data. Please check your addresses and package dimensions.');
        } else if (error.message.includes('404')) {
          throw new Error('EasyPost service unavailable. Please try again later.');
        }
      }
      
      throw error;
    }
  }

  private async createShipmentViaEdgeFunction(shipmentData: ShipmentRequest): Promise<ShipmentResponse> {
    console.log('Using Edge Function for shipment creation');

    const { data, error } = await supabase.functions.invoke<EasyPostEdgeResponse>('create-shipment', {
      body: { shipmentData }
    });

    if (error) {
      console.error('Edge Function error:', error);
      
      // Handle specific error cases
      if (error.message.includes('EasyPost API key not configured')) {
        throw new Error('EasyPost configuration issue. Please contact support.');
      } else if (error.message.includes('Invalid shipment data')) {
        throw new Error('Please verify your shipping addresses and package dimensions.');
      }
      
      throw new Error(error.message || 'Failed to create shipment');
    }

    if (!data) {
      throw new Error('No response from shipment service');
    }

    console.log('Shipment created via Edge Function:', data.id);
    console.log('SmartRates returned:', data.smartRates?.length || 0);
    console.log('Standard rates returned:', data.rates?.length || 0);

    // If no SmartRates but we have standard rates, log the issue
    if ((!data.smartRates || data.smartRates.length === 0) && data.rates && data.rates.length > 0) {
      console.warn('⚠️ SmartRates not available. Possible causes:');
      console.warn('1. SmartRates not enabled for your EasyPost account');
      console.warn('2. Your account tier may not support SmartRates');
      console.warn('3. Address combination not supported for SmartRates');
      console.warn('4. Package specifications outside SmartRate coverage');
      console.warn('Falling back to standard rates.');
    }

    if (!data.rates?.length && !data.smartRates?.length) {
      throw new Error('No shipping rates available. Please check your package dimensions and addresses.');
    }

    // Map EasyPostEdgeResponse to ShipmentResponse
    const shipmentResponse: ShipmentResponse = {
      ...data,
      object: data['object'] || 'shipment',
      status: data['status'] || 'unknown',
      selected_rate: data['selected_rate'] || null,
      rates: data.rates ?? [],
    };
    
    return shipmentResponse;
  }

  private async createShipmentDirectly(shipmentData: ShipmentRequest): Promise<ShipmentResponse> {
    const response = await fetch(`${this.baseUrl}/shipments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shipment: {
          ...shipmentData,
          options: shipmentData.options
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('EasyPost API error:', errorData);
      
      if (response.status === 401) {
        throw new Error('Invalid EasyPost API key. Please check your configuration.');
      } else if (response.status === 422) {
        throw new Error('Invalid shipment data. Please check your addresses and package dimensions.');
      }
      
      throw new Error(errorData.error?.message || 'Failed to create shipment');
    }

    const shipmentResponse = await response.json();

    console.log('Shipment created successfully:');
    console.log('- SmartRates:', shipmentResponse.smartRates ? shipmentResponse.smartRates.length : 0);
    console.log('- Standard rates:', shipmentResponse.rates ? shipmentResponse.rates.length : 0);

    if ((!shipmentResponse.smartRates || shipmentResponse.smartRates.length === 0) &&
      shipmentResponse.rates && shipmentResponse.rates.length > 0) {
      console.warn('⚠️ SmartRates not available - falling back to standard rates');
    }

    return shipmentResponse;
  }
}

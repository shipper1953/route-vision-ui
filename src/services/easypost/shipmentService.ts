
import { ShipmentRequest, ShipmentResponse } from "@/types/easypost";
import { supabase } from "@/integrations/supabase/client";

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
      
      shipmentData.options.smartrate_accuracy = shipmentData.options.smartrate_accuracy || 'percentile_50';
      
      console.log('SmartRate configuration:', {
        smartrate_accuracy: shipmentData.options.smartrate_accuracy
      });
      
      if (this.useEdgeFunctions) {
        return this.createShipmentViaEdgeFunction(shipmentData);
      }
      
      return this.createShipmentDirectly(shipmentData);
    } catch (error) {
      console.error('Error creating shipment:', error);
      throw error;
    }
  }

  private async createShipmentViaEdgeFunction(shipmentData: ShipmentRequest): Promise<ShipmentResponse> {
    console.log('Using Edge Function for shipment creation');
    
    const { data, error } = await supabase.functions.invoke('create-shipment', {
      body: { shipmentData },
      headers: {
        Authorization: undefined
      }
    });
    
    if (error) {
      console.error('Edge Function error:', error);
      throw new Error(error.message || 'Edge Function returned a non-2xx status code');
    }
    
    console.log('Shipment created via Edge Function:', data?.id);
    console.log('SmartRates returned:', data?.smartrates?.length || 0);
    console.log('Standard rates returned:', data?.rates?.length || 0);
    
    if ((!data.smartrates || data.smartrates.length === 0) && data.rates && data.rates.length > 0) {
      await this.tryGetSmartRatesViaEdgeFunction(data);
    }
    
    if (!data.rates?.length && !data.smartrates?.length) {
      console.warn('No rates were returned from EasyPost API for this shipment');
    }
    
    return data;
  }

  private async tryGetSmartRatesViaEdgeFunction(data: any): Promise<void> {
    console.log('Attempting to retrieve SmartRates via dedicated endpoint...');
    
    try {
      const { data: smartRateResponse, error: smartRateError } = await supabase.functions.invoke('get-smartrates', {
        body: { 
          shipmentId: data.id,
          accuracy: 'percentile_75'
        }
      });
      
      if (!smartRateError && smartRateResponse?.smartRates?.length > 0) {
        data.smartrates = smartRateResponse.smartRates;
        console.log('✅ Successfully retrieved SmartRates via dedicated endpoint:', data.smartrates.length);
      } else {
        console.warn('SmartRates endpoint error or no SmartRates returned:', smartRateError || 'No SmartRates in response');
      }
    } catch (smartRateErr) {
      console.warn('Could not retrieve SmartRates via dedicated endpoint:', smartRateErr);
    }
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
      throw new Error(errorData.error?.message || 'Failed to create shipment');
    }
    
    const shipmentResponse = await response.json();
    
    console.log('Shipment created successfully:');
    console.log('- SmartRates:', shipmentResponse.smartrates ? shipmentResponse.smartrates.length : 0);
    console.log('- Standard rates:', shipmentResponse.rates ? shipmentResponse.rates.length : 0);
    
    if ((!shipmentResponse.smartrates || shipmentResponse.smartrates.length === 0) && 
        shipmentResponse.rates && shipmentResponse.rates.length > 0) {
      await this.tryGetSmartRatesDirectly(shipmentResponse);
    }
    
    return shipmentResponse;
  }

  private async tryGetSmartRatesDirectly(shipmentResponse: any): Promise<void> {
    console.log('No SmartRates in initial response, trying dedicated endpoint...');
    
    try {
      const smartRateResponse = await fetch(`${this.baseUrl}/shipments/${shipmentResponse.id}/smartrate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          smartrate_accuracy: 'percentile_75'
        }),
      });
      
      if (smartRateResponse.ok) {
        const smartRateData = await smartRateResponse.json();
        if (smartRateData.smartrates && smartRateData.smartrates.length > 0) {
          shipmentResponse.smartrates = smartRateData.smartrates;
          console.log('✅ Successfully retrieved SmartRates via dedicated endpoint:', smartRateData.smartrates.length);
        }
      } else {
        const smartRateError = await smartRateResponse.json();
        console.warn('SmartRate endpoint error:', smartRateError);
      }
    } catch (smartRateErr) {
      console.warn('Error calling SmartRate endpoint:', smartRateErr);
    }
  }
}


import { EasyPostService } from "@/services/easypostService";
import { Address, AddressVerificationResult, ShipmentRequest, ShipmentResponse } from "@/types/easypost";
import { supabase } from "@/integrations/supabase/client";

/**
 * Implementation of the EasyPost service that uses the real EasyPost API
 */
export class RealEasyPostService implements EasyPostService {
  private apiKey: string;
  private baseUrl = "https://api.easypost.com/v2";
  private useEdgeFunctions: boolean;
  
  /**
   * Creates a new instance of the RealEasyPostService
   * @param apiKey The EasyPost API key
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.useEdgeFunctions = !apiKey;
    
    if (this.apiKey) {
      console.log('Using direct EasyPost API connection');
    } else {
      console.log('Using Supabase Edge Functions for EasyPost operations');
    }
  }
  
  /**
   * Verifies an address through the EasyPost API
   * @param address The address to verify
   * @returns A promise that resolves to the verification result
   */
  async verifyAddress(address: Address): Promise<AddressVerificationResult> {
    try {
      console.log('Verifying address with EasyPost:', address);
      
      if (this.useEdgeFunctions) {
        // Use Edge Function if no API key is available in the client
        const { data, error } = await supabase.functions.invoke('address-lookup', {
          body: { address }
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        return data;
      }
      
      // Direct API call if API key is available
      const response = await fetch(`${this.baseUrl}/addresses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          address: {
            street1: address.street1,
            street2: address.street2,
            city: address.city,
            state: address.state,
            zip: address.zip,
            country: address.country,
            company: address.company,
            name: address.name,
            phone: address.phone,
            email: address.email
          },
          verify: ['delivery']
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('EasyPost API error:', errorData);
        throw new Error(errorData.error?.message || 'Failed to verify address');
      }
      
      const result = await response.json();
      return {
        id: result.id,
        address: {
          street1: result.street1,
          street2: result.street2,
          city: result.city,
          state: result.state,
          zip: result.zip,
          country: result.country,
          company: result.company,
          name: result.name,
          phone: result.phone,
          email: result.email
        },
        verifications: result.verifications
      };
    } catch (error) {
      console.error('Error verifying address:', error);
      throw error;
    }
  }
  
  /**
   * Creates a new shipment with the EasyPost API
   * @param shipmentData The shipment data to create
   * @returns A promise that resolves to the created shipment
   */
  async createShipment(shipmentData: ShipmentRequest): Promise<ShipmentResponse> {
    try {
      console.log('Creating shipment with data:', shipmentData);
      
      // Ensure we have options
      if (!shipmentData.options) {
        shipmentData.options = {};
      }
      
      // Configure SmartRate with multiple fallback accuracy levels
      shipmentData.options.smartrate_accuracy = shipmentData.options.smartrate_accuracy || 'percentile_50';
      
      console.log('SmartRate configuration:', {
        smartrate_accuracy: shipmentData.options.smartrate_accuracy
      });
      
      if (this.useEdgeFunctions) {
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
        
        // If no SmartRates but we have regular rates, try to get SmartRates using the dedicated endpoint
        if ((!data.smartrates || data.smartrates.length === 0) && data.rates && data.rates.length > 0) {
          console.log('Attempting to retrieve SmartRates via dedicated endpoint...');
          
          try {
            const { data: smartRateData, error: smartRateError } = await supabase.functions.invoke('get-smartrates', {
              body: { 
                shipmentId: data.id,
                accuracy: 'percentile_75'
              }
            });
            
            if (!smartRateError && smartRateData?.smartrates?.length > 0) {
              data.smartrates = smartRateData.smartrates;
              console.log('✅ Successfully retrieved SmartRates via dedicated endpoint:', data.smartrates.length);
            }
          } catch (smartRateErr) {
            console.warn('Could not retrieve SmartRates via dedicated endpoint:', smartRateErr);
          }
        }
        
        if (!data.rates?.length && !data.smartrates?.length) {
          console.warn('No rates were returned from EasyPost API for this shipment');
        }
        
        return data;
      }
      
      // Direct API call if API key is available
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
      
      // If no SmartRates, try the dedicated SmartRate endpoint
      if ((!shipmentResponse.smartrates || shipmentResponse.smartrates.length === 0) && 
          shipmentResponse.rates && shipmentResponse.rates.length > 0) {
        
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
      
      return shipmentResponse;
    } catch (error) {
      console.error('Error creating shipment:', error);
      throw error;
    }
  }
  
  /**
   * Purchases a shipping label for a shipment
   * @param shipmentId The ID of the shipment to purchase a label for
   * @param rateId The ID of the rate to purchase
   * @returns A promise that resolves to the purchased label data
   */
  async purchaseLabel(shipmentId: string, rateId: string): Promise<any> {
    try {
      console.log(`Purchasing label for shipment ${shipmentId} with rate ${rateId}`);
      
      if (this.useEdgeFunctions) {
        // Use Edge Function if no API key is available in the client
        // CRITICAL FIX: Do not pass authorization headers to avoid 401 errors
        const { data, error } = await supabase.functions.invoke('purchase-label', {
          body: { shipmentId, rateId },
          headers: {
            // Do not include authorization headers to avoid 401 errors
            Authorization: undefined
          }
        });
        
        if (error) {
          console.error('Edge Function error:', error);
          
          // Improved error handling to pass through detailed error messages
          if (error.message.includes('422')) {
            // Try to extract the EasyPost API error from the response
            try {
              const errorDetails = JSON.parse(error.message.split('422 ')[1]);
              if (errorDetails.error === 'EasyPost API error' && errorDetails.details?.error?.message) {
                throw new Error(`EasyPost validation failed: ${errorDetails.details.error.message}`);
              }
            } catch (parseError) {
              // If parsing fails, just throw the original error
            }
          }
          
          throw new Error(error.message);
        }
        
        // Store the purchased label data in sessionStorage for the Shipments page to use
        if (data) {
          sessionStorage.setItem('lastPurchasedLabel', JSON.stringify(data));
          
          // Also try to update the order status in localStorage
          try {
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            const updatedOrders = orders.map((order: any) => {
              if (order.status === 'ready_to_ship') {
                return {...order, status: 'shipped'};
              }
              return order;
            });
            localStorage.setItem('orders', JSON.stringify(updatedOrders));
          } catch (e) {
            console.log('Could not update orders in localStorage:', e);
          }
        }
        
        return data;
      }
      
      // Direct API call if API key is available
      const response = await fetch(`${this.baseUrl}/shipments/${shipmentId}/buy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          rate: { id: rateId }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error purchasing label:', errorData);
        throw new Error(errorData.error?.message || 'Failed to purchase label');
      }
      
      const labelData = await response.json();
      console.log('Label purchased successfully:', labelData);
      
      // Store the purchased label data in sessionStorage for the Shipments page to use
      sessionStorage.setItem('lastPurchasedLabel', JSON.stringify(labelData));
      
      return labelData;
    } catch (error) {
      console.error('Error purchasing label:', error);
      throw error;
    }
  }
}

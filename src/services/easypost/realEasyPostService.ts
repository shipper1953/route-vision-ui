
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
        const { data, error } = await supabase.functions.invoke('verify-address', {
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
      
      if (this.useEdgeFunctions) {
        // Use Edge Function if no API key is available in the client
        const { data, error } = await supabase.functions.invoke('create-shipment', {
          body: { shipmentData }
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        return data;
      }
      
      // Add SmartRate options if not already present
      const options = shipmentData.options || {};
      options.smartrate_accuracy = options.smartrate_accuracy || 'percentile_95';
      
      const response = await fetch(`${this.baseUrl}/shipments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          shipment: {
            ...shipmentData,
            options
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('EasyPost API error:', errorData);
        throw new Error(errorData.error?.message || 'Failed to create shipment');
      }
      
      const shipmentResponse = await response.json();
      console.log('Shipment created successfully:', shipmentResponse);
      
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
        const { data, error } = await supabase.functions.invoke('purchase-label', {
          body: { shipmentId, rateId }
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        return data;
      }
      
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
      
      return labelData;
    } catch (error) {
      console.error('Error purchasing label:', error);
      throw error;
    }
  }
}

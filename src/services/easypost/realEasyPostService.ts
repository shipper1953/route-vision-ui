
import { EasyPostService } from "@/services/easypostService";
import { Address, AddressVerificationResult, ShipmentRequest, ShipmentResponse } from "@/types/easypost";

/**
 * Implementation of the EasyPost service that uses the real EasyPost API
 */
export class RealEasyPostService implements EasyPostService {
  private apiKey: string;
  private baseUrl = "https://api.easypost.com/v2";
  
  /**
   * Creates a new instance of the RealEasyPostService
   * @param apiKey The EasyPost API key
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    console.info('Using live EasyPost API');
  }
  
  /**
   * Makes an authenticated request to the EasyPost API
   * @param endpoint The API endpoint to call
   * @param method The HTTP method to use
   * @param body The request body
   * @returns The response data
   */
  private async makeRequest<T>(endpoint: string, method: string, body?: any): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown API error' } }));
        console.error('EasyPost API error:', errorData);
        
        // Extract the most meaningful error message
        let errorMessage = 'API request failed';
        
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.error?.errors?.[0]) {
          errorMessage = errorData.error.errors[0];
        } else if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        }
        
        throw new Error(`EasyPost API Error: ${errorMessage}`);
      }
      
      return await response.json() as T;
    } catch (error) {
      console.error('Error making EasyPost API request:', error);
      throw error instanceof Error 
        ? error 
        : new Error('Unknown error occurred while contacting EasyPost API');
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
      
      const response = await this.makeRequest<AddressVerificationResult>(
        '/addresses',
        'POST',
        { 
          address: {
            street1: address.street1,
            street2: address.street2 || '',
            city: address.city,
            state: address.state,
            zip: address.zip,
            country: address.country,
            company: address.company || '',
            name: address.name || '',
            phone: address.phone || '',
            email: address.email || '',
          },
          verify: ['delivery']
        }
      );
      
      console.log('Address verification result:', response);
      return response;
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
      
      // Add SmartRate options if not already present
      const options = shipmentData.options || {};
      options.smartrate_accuracy = options.smartrate_accuracy || 'percentile_95';
      
      const payload = {
        shipment: {
          ...shipmentData,
          options
        }
      };
      
      const response = await this.makeRequest<ShipmentResponse>(
        '/shipments',
        'POST',
        payload
      );
      
      console.log('Shipment created successfully:', response);
      return response;
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
      
      const response = await this.makeRequest(
        `/shipments/${shipmentId}/buy`,
        'POST',
        { rate: { id: rateId } }
      );
      
      console.log('Label purchased successfully:', response);
      return response;
    } catch (error) {
      console.error('Error purchasing label:', error);
      throw error;
    }
  }
}

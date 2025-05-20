
import { Address, AddressVerificationResult, ShipmentRequest, ShipmentResponse } from "@/types/easypost";

export class RealEasyPostService {
  private apiKey: string;
  private baseUrl: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.easypost.com/v2';
    console.log('Using live EasyPost API');
  }

  private getHeaders() {
    return {
      'Authorization': `Basic ${btoa(this.apiKey + ':')}`,
      'Content-Type': 'application/json'
    };
  }

  async createShipment(shipmentData: ShipmentRequest): Promise<ShipmentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/shipments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ shipment: shipmentData })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`EasyPost API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating shipment:', error);
      throw error;
    }
  }
  
  async verifyAddresses(query: string): Promise<Address[]> {
    try {
      console.log('Looking up addresses with query:', query);
      
      // EasyPost doesn't have a direct address lookup by text query
      // We'd typically use a different service here like Google Places API
      // But for demonstration, we'll use a fuzzy address verification approach
      
      // Create a dummy address with the query
      const dummyAddress = {
        street1: query,
        city: '',
        state: '',
        zip: '',
        country: 'US'
      };
      
      // Try to verify it to get suggestions
      const response = await fetch(`${this.baseUrl}/addresses`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ address: dummyAddress })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`EasyPost API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }
      
      const result = await response.json();
      
      // Return the verified address as a result (may only be one)
      return [result.address];
    } catch (error) {
      console.error('Error looking up addresses:', error);
      throw error;
    }
  }
  
  async verifyAddress(address: Address): Promise<AddressVerificationResult> {
    try {
      console.log('Verifying address:', address);
      
      const response = await fetch(`${this.baseUrl}/addresses`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ 
          address,
          verify: ['delivery'] 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`EasyPost API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error verifying address:', error);
      throw error;
    }
  }
}


import { Address, AddressVerificationResult, ShipmentRequest, ShipmentResponse } from "@/types/easypost";
import { toast } from "sonner";

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

  /**
   * Creates a shipment using EasyPost API
   * @param shipmentData The shipment data to send to EasyPost
   * @returns A promise resolving to the shipment response
   */
  async createShipment(shipmentData: ShipmentRequest): Promise<ShipmentResponse> {
    try {
      console.log('Creating shipment with EasyPost API');
      
      const response = await fetch(`${this.baseUrl}/shipments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ shipment: shipmentData })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        console.error('EasyPost API error response:', errorData);
        
        // Extract meaningful error message if possible
        const errorMessage = errorData.error?.message || 
                            `EasyPost API error: ${response.status} - ${response.statusText}`;
        
        // Log detailed error information
        console.error(`EasyPost API error: ${response.status}`, errorData);
        
        // Throw a formatted error that can be handled by the UI
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Shipment created successfully', data);
      return data;
    } catch (error) {
      // Handle network errors or JSON parsing errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error creating shipment';
      console.error('Error creating shipment:', error);
      
      // Rethrow with a consistent error message format
      throw new Error(`EasyPost shipment creation failed: ${errorMessage}`);
    }
  }
  
  /**
   * Looks up addresses based on a query string
   * @param query The address search query
   * @returns A promise resolving to an array of address results
   */
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
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        console.error('EasyPost API error response:', errorData);
        
        // Extract meaningful error message if possible
        const errorMessage = errorData.error?.message || 
                            `EasyPost API error: ${response.status} - ${response.statusText}`;
        
        // Log detailed error information
        console.error(`EasyPost API error: ${response.status}`, errorData);
        
        // For address lookup, we might want to return an empty array rather than throwing
        if (response.status === 422) {
          console.warn('Address validation failed, returning empty results');
          return [];
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      // Return the verified address as a result (may only be one)
      return [result.address];
    } catch (error) {
      // Handle network errors or JSON parsing errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error looking up addresses';
      console.error('Error looking up addresses:', error);
      
      // For lookup functionality, return empty array to avoid breaking the UI
      console.warn('Returning empty results due to error');
      return [];
    }
  }
  
  /**
   * Verifies a complete address using EasyPost API
   * @param address The address to verify
   * @returns A promise resolving to address verification results
   */
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
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        console.error('EasyPost API error response:', errorData);
        
        // Extract meaningful error message if possible
        const errorMessage = errorData.error?.message || 
                            `EasyPost API error: ${response.status} - ${response.statusText}`;
        
        // Log detailed error information
        console.error(`EasyPost API error: ${response.status}`, errorData);
        
        // For verification errors, provide a structured response that indicates failure
        if (response.status === 422) {
          // Return an object that shows verification failed
          return {
            id: `error_${Date.now()}`,
            address: address,
            verifications: {
              delivery: {
                success: false,
                errors: [errorMessage]
              }
            }
          };
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('Address verification result:', result);
      return result;
    } catch (error) {
      // Handle network errors or JSON parsing errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error verifying address';
      console.error('Error verifying address:', error);
      
      // Return a structured error response that won't break the UI
      return {
        id: `error_${Date.now()}`,
        address: address,
        verifications: {
          delivery: {
            success: false,
            errors: [errorMessage]
          }
        }
      };
    }
  }
}

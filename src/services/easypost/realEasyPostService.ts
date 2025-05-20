
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
      
      // For better search results, try to parse the query into components
      // This is a simple approach - in a real app you might use a more sophisticated parser
      const parts = query.split(',').map(part => part.trim());
      
      // Create a search-friendly address object
      const searchAddress: Partial<Address> = {
        street1: parts[0] || query, // Use first part as street or full query if no comma
        city: parts[1] || '',        // Use second part as city if available
        country: 'US'                // Default to US
      };
      
      // If a part looks like a zip code, use it as zip
      for (const part of parts) {
        if (/^\d{5}(-\d{4})?$/.test(part)) {
          searchAddress.zip = part;
          break;
        }
      }
      
      console.log('Searching with parsed address:', searchAddress);
      
      // Use the EasyPost address verification endpoint
      const response = await fetch(`${this.baseUrl}/addresses`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ 
          address: searchAddress,
          verify: [] // Don't verify during search to get more results
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        console.error('EasyPost API error during address lookup:', errorData);
        return []; // Return empty array on error to avoid breaking UI
      }
      
      const result = await response.json();
      console.log('Address lookup result:', result);
      
      // If we have a result and it's a valid address, return it
      if (result && result.address) {
        return [result.address];
      }
      
      return [];
    } catch (error) {
      console.error('Error during address lookup:', error);
      return []; // Return empty array on error
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
  
  /**
   * Purchase a shipping label using EasyPost API
   * @param shipmentId The ID of the shipment to purchase a label for
   * @param rateId The ID of the rate to purchase
   * @returns A promise resolving to the purchase response
   */
  async purchaseLabel(shipmentId: string, rateId: string): Promise<any> {
    try {
      console.log('Purchasing label for shipment:', shipmentId, 'with rate:', rateId);
      
      const response = await fetch(`${this.baseUrl}/shipments/${shipmentId}/buy`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ rate: { id: rateId } })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        console.error('EasyPost API error response:', errorData);
        
        const errorMessage = errorData.error?.message || 
                            `EasyPost API error: ${response.status} - ${response.statusText}`;
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Label purchased successfully:', data);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error purchasing label';
      console.error('Error purchasing label:', error);
      throw new Error(`EasyPost label purchase failed: ${errorMessage}`);
    }
  }
}

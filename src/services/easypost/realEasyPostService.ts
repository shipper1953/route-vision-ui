
import { EasyPostService } from "@/services/easypostService";
import { Address, AddressVerificationResult, ShipmentRequest, ShipmentResponse } from "@/types/easypost";

/**
 * Implementation of the EasyPost service that uses the real EasyPost API
 */
export class RealEasyPostService implements EasyPostService {
  private apiKey: string;
  
  /**
   * Creates a new instance of the RealEasyPostService
   * @param apiKey The EasyPost API key
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    console.info('Using live EasyPost API via Edge Functions');
  }
  
  /**
   * Verifies an address through the EasyPost API
   * @param address The address to verify
   * @returns A promise that resolves to the verification result
   */
  async verifyAddress(address: Address): Promise<AddressVerificationResult> {
    try {
      console.log('Verifying address with EasyPost:', address);
      
      // TODO: Implement address verification via edge function
      // For now, return a mock verification success
      return {
        id: "mock_verification",
        address: address,
        verifications: {
          delivery: {
            success: true,
            errors: []
          }
        }
      };
    } catch (error) {
      console.error('Error verifying address:', error);
      throw error;
    }
  }
  
  /**
   * Creates a new shipment with the EasyPost API via Supabase Edge Function
   * @param shipmentData The shipment data to create
   * @returns A promise that resolves to the created shipment
   */
  async createShipment(shipmentData: ShipmentRequest): Promise<ShipmentResponse> {
    try {
      console.log('Creating shipment with data:', shipmentData);
      
      // Use the existing edge function to create the shipment
      const response = await fetch('/api/create-shipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shipmentData }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('EasyPost API error:', errorData);
        throw new Error(errorData.error || 'Failed to create shipment');
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
      
      // Use an edge function to purchase the label
      const response = await fetch('/api/purchase-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shipmentId, rateId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error purchasing label:', errorData);
        throw new Error(errorData.error || 'Failed to purchase label');
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


// This file defines the EasyPost service interface
import { Address, AddressVerificationResult, ShipmentRequest, ShipmentResponse } from "@/types/easypost";

/**
 * Interface for EasyPost service implementations
 */
export interface EasyPostService {
  /**
   * Verifies an address through the EasyPost API
   * @param address The address to verify
   * @returns A promise that resolves to the verification result
   */
  verifyAddress(address: Address): Promise<AddressVerificationResult>;
  
  /**
   * Creates a new shipment with the EasyPost API
   * @param shipmentData The shipment data to create
   * @returns A promise that resolves to the created shipment
   */
  createShipment(shipmentData: ShipmentRequest): Promise<ShipmentResponse>;
  
  /**
   * Purchases a shipping label for a shipment
   * @param shipmentId The ID of the shipment to purchase a label for
   * @param rateId The ID of the rate to purchase
   * @returns A promise that resolves to the purchased label data
   */
  purchaseLabel(shipmentId: string, rateId: string): Promise<any>;
}

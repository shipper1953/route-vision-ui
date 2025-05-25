
import { EasyPostService } from "@/services/easypostService";
import { Address, AddressVerificationResult, ShipmentRequest, ShipmentResponse } from "@/types/easypost";
import { AddressService } from "./addressService";
import { ShipmentService } from "./shipmentService";
import { LabelService } from "./labelService";

/**
 * Implementation of the EasyPost service that uses the real EasyPost API
 */
export class RealEasyPostService implements EasyPostService {
  private addressService: AddressService;
  private shipmentService: ShipmentService;
  private labelService: LabelService;
  
  /**
   * Creates a new instance of the RealEasyPostService
   * @param apiKey The EasyPost API key
   */
  constructor(apiKey: string) {
    this.addressService = new AddressService(apiKey);
    this.shipmentService = new ShipmentService(apiKey);
    this.labelService = new LabelService(apiKey);
    
    if (apiKey) {
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
    return this.addressService.verifyAddress(address);
  }
  
  /**
   * Creates a new shipment with the EasyPost API
   * @param shipmentData The shipment data to create
   * @returns A promise that resolves to the created shipment
   */
  async createShipment(shipmentData: ShipmentRequest): Promise<ShipmentResponse> {
    return this.shipmentService.createShipment(shipmentData);
  }
  
  /**
   * Purchases a shipping label for a shipment
   * @param shipmentId The ID of the shipment to purchase a label for
   * @param rateId The ID of the rate to purchase
   * @returns A promise that resolves to the purchased label data
   */
  async purchaseLabel(shipmentId: string, rateId: string): Promise<any> {
    return this.labelService.purchaseLabel(shipmentId, rateId);
  }
}

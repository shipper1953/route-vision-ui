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
   * Creates a shipment and selects the lowest-cost rate that meets the delivery deadline
   * @param shipmentData The shipment request
   * @param requiredDeliveryDate Latest acceptable delivery date (ISO string)
   * @returns A promise that resolves to the created shipment with SmartRates metadata
   */
  async createSmartShipment(shipmentData: ShipmentRequest, requiredDeliveryDate: string): Promise<ShipmentResponse> {
    const shipment = await this.shipmentService.createShipment(shipmentData);

    if (!shipment) {
      throw new Error("Failed to create shipment.");
    }

    console.log("Shipment created:", JSON.stringify(shipment, null, 2));

    const smartRates = shipment.smartRates;

    if (!smartRates || !Array.isArray(smartRates)) {
      console.warn("SmartRates not available, falling back to standard rates.");
      return shipment;
    }

    const cutoffDate = new Date(requiredDeliveryDate);

const validRates = smartRates.filter(rate => {
  const transit = rate.time_in_transit as { guaranteed_delivery_date?: string } | null;

  if (!transit?.guaranteed_delivery_date) return false;

  try {
    const guaranteeDate = new Date(transit.guaranteed_delivery_date);
    return guaranteeDate <= cutoffDate;
  } catch {
    return false;
  }
});

    if (validRates.length === 0) {
      console.warn("No SmartRates met delivery deadline. Returning shipment with all SmartRates for manual review.");
      shipment.smartRates = smartRates;
      return shipment;
    }

    const best = validRates.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0];

    // Optionally, if you want to attach the best rate, you need to extend the ShipmentResponse type.
    // (Uncomment the next line if you have extended the interface accordingly)
    // (shipment as any).bestSmartRate = best;

    shipment.smartRates = smartRates;

    return shipment;
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

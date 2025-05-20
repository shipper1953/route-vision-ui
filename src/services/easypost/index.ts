
import { MockEasyPostService } from "./mockEasyPostService";
import { RealEasyPostService } from "./realEasyPostService";
import { Address, AddressVerificationResult, ShipmentRequest, ShipmentResponse } from "@/types/easypost";

class EasyPostService {
  private service: MockEasyPostService | RealEasyPostService;
  private useMock: boolean;

  constructor(apiKey: string) {
    this.useMock = apiKey === 'EASYPOST_API_KEY_PLACEHOLDER';
    
    if (!this.useMock) {
      this.service = new RealEasyPostService(apiKey);
    } else {
      console.log('Using mock EasyPost service');
      this.service = new MockEasyPostService();
    }
  }

  async createShipment(shipmentData: ShipmentRequest): Promise<ShipmentResponse> {
    return this.service.createShipment(shipmentData);
  }
  
  async verifyAddresses(query: string): Promise<Address[]> {
    return this.service.verifyAddresses(query);
  }
  
  async verifyAddress(address: Address): Promise<AddressVerificationResult> {
    return this.service.verifyAddress(address);
  }
}

// Get API key from Supabase environment variable
const apiKey = import.meta.env.VITE_EASYPOST_API_KEY || 'EASYPOST_API_KEY_PLACEHOLDER';
const easyPostService = new EasyPostService(apiKey);

export default easyPostService;
export * from "@/types/easypost";

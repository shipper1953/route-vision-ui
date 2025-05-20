
import { RealEasyPostService } from "./realEasyPostService";
import { Address, AddressVerificationResult, ShipmentRequest, ShipmentResponse } from "@/types/easypost";

// Get API key from environment variable
const apiKey = import.meta.env.VITE_EASYPOST_API_KEY || '';

// Create a single instance of the EasyPost service
const easyPostService = new RealEasyPostService(apiKey);

export default easyPostService;
export * from "@/types/easypost";

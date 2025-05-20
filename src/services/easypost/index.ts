
import { RealEasyPostService } from "./realEasyPostService";
import { Address, AddressVerificationResult, ShipmentRequest, ShipmentResponse } from "@/types/easypost";

// Get API key from environment variable - checking both naming conventions
const apiKey = import.meta.env.VITE_EASYPOST_API_KEY || 
               import.meta.env.EASYPOST_API_KEY || 
               '';

if (!apiKey) {
  console.error('EasyPost API key is missing. Please set VITE_EASYPOST_API_KEY or EASYPOST_API_KEY environment variable.');
}

// Create a single instance of the EasyPost service with the real API
const easyPostService = new RealEasyPostService(apiKey);

// Export the service instance as the default export
export default easyPostService;

// Re-export types from the easypost types file
export * from "@/types/easypost";


import { RealEasyPostService } from "./realEasyPostService";
import { Address, AddressVerificationResult, ShipmentRequest, ShipmentResponse } from "@/types/easypost";
import { supabase } from "@/integrations/supabase/client";

// Get API key from environment variable - checking both naming conventions
const apiKey = import.meta.env.VITE_EASYPOST_API_KEY || 
               import.meta.env.EASYPOST_API_KEY || 
               '';

// Check if the API key is available
if (!apiKey) {
  console.warn('EasyPost API key not found in environment variables. Attempting to use Supabase Edge Functions for shipment operations instead.');
} else {
  console.log('EasyPost API key is configured.');
}

// Create a single instance of the EasyPost service with the real API
const easyPostService = new RealEasyPostService(apiKey);

// Export the service instance as the default export
export default easyPostService;

// Re-export types from the easypost types file
export * from "@/types/easypost";

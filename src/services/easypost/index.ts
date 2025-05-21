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

// Add a new export for the Qboid scanner integration
export const listenForQboidData = async (onDimensionsReceived: (dimensions: {
  length: number;
  width: number;
  height: number;
  weight: number;
  orderId?: string;
}) => void) => {
  try {
    // In a real implementation, this could be:
    // 1. A WebSocket connection that listens for events from the Qboid scanner
    // 2. A polling mechanism that checks for new dimension data periodically
    // 3. A direct connection to the scanner's API
    
    // For now, we'll just return information about the endpoint
    console.log('Qboid integration configured. Endpoint URL:', 
      'https://gidrlosmhpvdcogrkidj.supabase.co/functions/v1/qboid-dimensions');
    
    return {
      endpointUrl: 'https://gidrlosmhpvdcogrkidj.supabase.co/functions/v1/qboid-dimensions',
      configureScanner: () => {
        console.log('Configure your Qboid scanner with the following settings:');
        console.log('1. Endpoint URL: https://gidrlosmhpvdcogrkidj.supabase.co/functions/v1/qboid-dimensions');
        console.log('2. Method: POST');
        console.log('3. Content-Type: application/json');
        console.log('4. Body format: { "length": number, "width": number, "height": number, "weight": number, "orderId": "optional" }');
      }
    };
  } catch (error) {
    console.error('Error setting up Qboid listener:', error);
    throw error;
  }
};


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

// Define the endpoint URL for Qboid directly
const QBOID_ENDPOINT_URL = 'https://gidrlosmhpvdcogrkidj.supabase.co/functions/v1/qboid-dimensions';

// Add a new export for the Qboid scanner integration
export const listenForQboidData = async (onDimensionsReceived: (dimensions: {
  length: number;
  width: number;
  height: number;
  weight: number;
  orderId?: string;
}) => void) => {
  try {
    console.log('Setting up Qboid integration with endpoint:', QBOID_ENDPOINT_URL);
    
    // For testing purposes, you can simulate a Qboid device sending data
    // This can be useful to verify that your callback works correctly
    setTimeout(() => {
      console.log('Note: You can test this by sending a POST request to the endpoint with this data:');
      console.log(JSON.stringify({
        length: 12.5,
        width: 8.75,
        height: 6.25,
        weight: 32,
        orderId: "TEST-123"
      }));
      
      console.log('Using curl:');
      console.log(`curl -X POST ${QBOID_ENDPOINT_URL} -H "Content-Type: application/json" -d '{"length": 12.5, "width": 8.75, "height": 6.25, "weight": 32, "orderId": "TEST-123"}'`);
    }, 1000);

    // Return the information needed to configure the Qboid scanner
    return {
      endpointUrl: QBOID_ENDPOINT_URL,
      configureScanner: () => {
        console.log('Configure your Qboid scanner with the following settings:');
        console.log('1. Endpoint URL:', QBOID_ENDPOINT_URL);
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

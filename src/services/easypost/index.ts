
import { RealEasyPostService } from "./realEasyPostService";
import { Address, AddressVerificationResult, ShipmentRequest, ShipmentResponse } from "@/types/easypost";
import { supabase } from "@/integrations/supabase/client";

// Get API key safely using environment variables
const apiKey = (() => {
  try {
    // Safely check for environment variables
    return process.env.VITE_EASYPOST_API_KEY || 
           process.env.EASYPOST_API_KEY || 
           '';
  } catch (e) {
    console.warn('Error accessing environment variables:', e);
    return '';
  }
})();

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

// Define the Qboid API configuration
const QBOID_CONFIG = {
  endpointUrl: 'https://gidrlosmhpvdcogrkidj.supabase.co/functions/v1/qboid-wifi-api-handler',
  deviceDiscoveryUrl: 'http://qboid.local/',
  configPath: '/config',
  wifiSetupPath: '/wifi'
};

// Add a new export for the Qboid scanner integration
export const listenForQboidData = async (onDimensionsReceived: (dimensions: {
  length: number;
  width: number;
  height: number;
  weight: number;
  orderId?: string;
}) => void) => {
  try {
    console.log('Setting up Qboid integration with endpoint:', QBOID_CONFIG.endpointUrl);
    
    // Get the API token from Supabase
    const { data: secretData } = await supabase
      .functions.invoke('qboid-wifi-api-handler', {
        body: { action: 'validate-token' }
      });
    
    // Return the configuration information needed to set up the Qboid scanner
    return {
      endpointUrl: QBOID_CONFIG.endpointUrl,
      deviceUrl: QBOID_CONFIG.deviceDiscoveryUrl,
      configureScanner: (deviceIp?: string) => {
        // Create the configuration URL
        const configUrl = deviceIp ? 
          `http://${deviceIp}${QBOID_CONFIG.configPath}` : 
          `${QBOID_CONFIG.deviceDiscoveryUrl}${QBOID_CONFIG.configPath}`;
          
        console.log('Configure your Qboid scanner with the following settings:');
        console.log('1. Device configuration URL:', configUrl);
        console.log('2. API Endpoint URL:', QBOID_CONFIG.endpointUrl);
        
        // Return configuration instructions for display
        return {
          configUrl,
          endpointUrl: QBOID_CONFIG.endpointUrl,
          instructions: [
            `Open ${configUrl} in your browser to access device settings`,
            "In the WiFi API tab, enter the following:",
            `API Endpoint: ${QBOID_CONFIG.endpointUrl}`,
            "Method: POST",
            "Content-Type: application/json",
            "Add Header: x-qboid-token: YOUR_API_TOKEN",
            "Save settings and place a package to test"
          ]
        };
      }
    };
  } catch (error) {
    console.error('Error setting up Qboid listener:', error);
    throw error;
  }
};

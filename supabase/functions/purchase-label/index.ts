
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { PurchaseLabelRequest } from './types.ts'
import { purchaseShippingLabel } from './easypostService.ts'
import { saveShipmentToDatabase } from './shipmentService.ts'
import { linkOrderToShipment } from './orderService.ts'
import { corsHeaders, handleCorsPreflightRequest, createErrorResponse, createSuccessResponse } from './corsUtils.ts'

// Get EasyPost API key from environment variables
const easyPostApiKey = Deno.env.get('EASYPOST_API_KEY') || 
                      Deno.env.get('VITE_EASYPOST_API_KEY')

console.log('EasyPost API key available in purchase-label function:', easyPostApiKey ? 'YES' : 'NO');

serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    const { shipmentId, rateId, orderId }: PurchaseLabelRequest = await req.json()
    
    if (!shipmentId || !rateId) {
      return createErrorResponse('Missing required parameters', null, 400);
    }
    
    console.log(`Purchasing label for shipment ${shipmentId} with rate ${rateId}`, orderId ? `for order ${orderId}` : '')
    
    if (!easyPostApiKey) {
      return createErrorResponse(
        'EasyPost API key is not available. Please configure it in Supabase Secrets with name EASYPOST_API_KEY or VITE_EASYPOST_API_KEY.',
        null,
        500
      );
    }
    
    // Call EasyPost API to purchase the label
    const responseData = await purchaseShippingLabel(shipmentId, rateId, easyPostApiKey);
    
    // Update shipment in database - use service role key to bypass RLS
    try {
      const result = await saveShipmentToDatabase(responseData, orderId);
      
      if (result && orderId && result.finalShipmentId) {
        await linkOrderToShipment(result.supabaseClient, String(orderId), result.finalShipmentId);
      }
    } catch (err) {
      console.error('Error updating shipment record:', err);
      // Continue even if database update fails
    }
    
    // Return the complete purchase response
    return createSuccessResponse(responseData);
    
  } catch (err) {
    console.error('Error processing request:', err);
    return createErrorResponse('Internal server error', err.message, 500);
  }
});

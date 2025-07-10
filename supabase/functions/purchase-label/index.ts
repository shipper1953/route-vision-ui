
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { saveShipmentToDatabase } from './shipmentService.ts'
import { linkShipmentToOrder } from './orderService.ts'
import { purchaseShippingLabel } from './easypostService.ts'
import { corsHeaders, handleCorsPreflightRequest, createErrorResponse, createSuccessResponse } from './corsUtils.ts'
import { authenticateUser, getUserCompany } from './authService.ts'
import { processWalletPayment } from './walletService.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// Fix for EASYPOST_API_KEY with newline characters
function getCleanEasyPostKey(): string | undefined {
  // Try clean key first
  let key = Deno.env.get('EASYPOST_API_KEY')
  if (key) {
    console.log('✅ Found clean EASYPOST_API_KEY')
    return key.trim()
  }
  
  // Try keys with newlines
  const variations = ['EASYPOST_API_KEY\n', 'EASYPOST_API_KEY\n\n', 'EASYPOST_API_KEY\r\n']
  for (const variant of variations) {
    key = Deno.env.get(variant)
    if (key) {
      console.log(`✅ Found EASYPOST_API_KEY with whitespace: "${variant}"`)
      return key.trim()
    }
  }
  
  console.log('❌ No EASYPOST_API_KEY found in any variation')
  return undefined
}

const easyPostApiKey = getCleanEasyPostKey()

console.log('EasyPost API key available in purchase-label function:', easyPostApiKey ? 'YES' : 'NO')

serve(async (req) => {
  console.log('=== PURCHASE LABEL FUNCTION START ===');
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return handleCorsPreflightRequest();
  }

  try {
    console.log('Processing purchase-label request...')
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', authHeader ? 'YES' : 'NO');
    console.log('Auth header value:', authHeader?.substring(0, 20) + '...');
    
    const user = await authenticateUser(authHeader);
    console.log('User authenticated successfully:', user.id);
    
    const companyId = await getUserCompany(user.id);
    console.log('User company_id:', companyId);

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return createErrorResponse('Invalid JSON in request body', parseError.message, 400);
    }
    
    const { shipmentId, rateId, orderId } = requestBody;
    
    if (!shipmentId || !rateId) {
      console.error('Missing required parameters:', { shipmentId, rateId });
      return createErrorResponse('Missing required parameters: shipmentId and rateId are required', null, 400);
    }
    
    console.log(`Purchasing label for shipment ${shipmentId} with rate ${rateId}${orderId ? ` for order ${orderId}` : ''} for user ${user.id}`);
    
    if (!easyPostApiKey) {
      console.error('EASYPOST_API_KEY environment variable not found');
      return createErrorResponse('EasyPost API key not configured', 'Please ensure EASYPOST_API_KEY is set in environment variables', 500);
    }
    console.log('EasyPost API key is configured');

    // Purchase label from EasyPost using the cleaned API key
    console.log('Calling EasyPost API...');
    const purchaseResponse = await purchaseShippingLabel(shipmentId, rateId, easyPostApiKey);
    console.log('Label purchased successfully from EasyPost:', purchaseResponse.id);
    
    const labelCost = parseFloat(purchaseResponse.selected_rate?.rate || '0');
    console.log('Label cost:', labelCost);

    // Process wallet payment
    await processWalletPayment(companyId, labelCost, user.id, purchaseResponse.id);
    
    // Save shipment to database with user_id
    let finalShipmentId = null;
    try {
      const saveResult = await saveShipmentToDatabase(purchaseResponse, orderId, user.id);
      finalShipmentId = saveResult.finalShipmentId;
      console.log('Shipment saved with ID:', finalShipmentId);
    } catch (dbError) {
      console.error('Database save error:', dbError);
      // Don't fail the label purchase if database save fails
    }
    
    // If we have an orderId, link the shipment to the order
    if (orderId && finalShipmentId) {
      try {
        console.log(`Attempting to link order ${orderId} to shipment ${finalShipmentId}`);
        const supabaseService = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          { auth: { persistSession: false } }
        );
        
        const linkSuccess = await linkShipmentToOrder(supabaseService, orderId, finalShipmentId);
        if (linkSuccess) {
          console.log(`✅ Successfully linked shipment ${purchaseResponse.id} to order ${orderId}`);
        } else {
          console.error(`❌ Failed to link shipment ${purchaseResponse.id} to order ${orderId}`);
        }
      } catch (linkError) {
        console.error('Error linking shipment to order:', linkError);
        // Don't fail the whole operation if linking fails
      }
    } else {
      console.log('Skipping order linking - missing data:', { orderId, finalShipmentId });
    }
    
    // Update shipment status in database using authenticated client
    try {
      const authenticatedClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );
      
      const { error: updateError } = await authenticatedClient
        .from('shipments')
        .update({
          status: 'purchased',
          label_url: purchaseResponse.postage_label?.label_url,
          tracking_number: purchaseResponse.tracking_code,
        })
        .eq('easypost_id', shipmentId)
        .eq('user_id', user.id);
      
      if (updateError) {
        console.error('Error updating shipment in database:', updateError);
      } else {
        console.log('Successfully updated shipment status in database');
      }
    } catch (updateErr) {
      console.error('Failed to update shipment status:', updateErr);
    }
    
    console.log('Returning successful response');
    return createSuccessResponse(purchaseResponse);
    
  } catch (err) {
    console.error('=== ERROR IN PURCHASE LABEL FUNCTION ===');
    console.error('Error type:', typeof err);
    console.error('Error constructor:', err.constructor?.name);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    
    // Handle rate limiting specifically
    if (err.message?.includes('rate limit') || err.message?.includes('RATE_LIMITED')) {
      console.log('Returning rate limit error response');
      return createErrorResponse('API rate limit exceeded', 'Please wait a few minutes before trying again', 429);
    }
    
    // Handle EasyPost API specific errors
    if (err.message?.includes('EasyPost')) {
      console.log('Returning EasyPost specific error response');
      return createErrorResponse('EasyPost API error', err.message, 422);
    }
    
    // Handle authentication errors
    if (err.message?.includes('Invalid EasyPost API key')) {
      console.log('Returning auth error response');
      return createErrorResponse('Authentication error', 'Invalid EasyPost API key configuration', 401);
    }
    
    console.log('Returning generic error response');
    return createErrorResponse('Internal server error', err.message, 500);
  }
})

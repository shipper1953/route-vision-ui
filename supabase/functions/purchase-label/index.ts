import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { saveShipmentToDatabase } from './shipmentService.ts'
import { linkShipmentToOrder } from './orderService.ts'
import { corsHeaders, handleCorsPreflightRequest, createErrorResponse, createSuccessResponse } from './corsUtils.ts'
import { authenticateUser, getUserCompany } from './authService.ts'
import { processWalletPayment } from './walletService.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

console.log('=== PURCHASE-LABEL v3.0 STARTUP ===')

// Fix for EASYPOST_API_KEY with newline characters - v3.0
function getCleanEasyPostKey(): string | undefined {
  try {
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
  } catch (error) {
    console.error('Error getting EASYPOST_API_KEY:', error)
    return undefined
  }
}

const easyPostApiKey = getCleanEasyPostKey()
console.log('EasyPost API key available:', easyPostApiKey ? 'YES' : 'NO')

async function ensurePhoneNumbers(shipmentId: string, apiKey: string) {
  console.log('Checking and fixing phone numbers for shipment:', shipmentId);
  
  // Get the current shipment details
  const getResponse = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!getResponse.ok) {
    console.log('Failed to get shipment details, proceeding with purchase anyway');
    return; // Don't fail the whole operation if we can't get details
  }
  
  const shipment = await getResponse.json();
  
  // Check if phone numbers are missing or empty
  const fromNeedsPhone = !shipment.from_address?.phone || shipment.from_address.phone.trim() === '';
  const toNeedsPhone = !shipment.to_address?.phone || shipment.to_address.phone.trim() === '';
  
  if (fromNeedsPhone || toNeedsPhone) {
    console.log('Phone numbers missing, updating shipment addresses');
    
    // Update the shipment with proper phone numbers
    const updateData: any = {};
    
    if (fromNeedsPhone) {
      updateData.from_address = {
        ...shipment.from_address,
        phone: "5555555555"
      };
    }
    
    if (toNeedsPhone) {
      updateData.to_address = {
        ...shipment.to_address,
        phone: "5555555555"
      };
    }
    
    const updateResponse = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shipment: updateData }),
    });
    
    if (updateResponse.ok) {
      console.log('✅ Successfully updated shipment with phone numbers');
    } else {
      console.log('⚠️ Failed to update shipment with phone numbers, but continuing...');
    }
  } else {
    console.log('✅ Phone numbers already present');
  }
}

async function purchaseShippingLabel(shipmentId: string, rateId: string, apiKey: string) {
  // First, ensure phone numbers are present
  await ensurePhoneNumbers(shipmentId, apiKey);
  
  console.log('Purchasing label for shipment:', shipmentId, 'with rate:', rateId);
  
  const response = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}/buy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      rate: { id: rateId }
    }),
  });
  
  const responseText = await response.text();
  let responseData;
  
  try {
    responseData = JSON.parse(responseText);
  } catch (err) {
    responseData = { raw_response: responseText };
  }
  
  if (!response.ok) {
    console.error('EasyPost API error:', responseData);
    
    // Provide more specific error messages
    let errorMessage = 'EasyPost API error';
    if (responseData.error?.message) {
      errorMessage = responseData.error.message;
    } else if (response.status === 422) {
      errorMessage = 'Invalid shipment or rate data. Please check your shipment configuration.';
    } else if (response.status === 401) {
      errorMessage = 'Invalid EasyPost API key. Please check your configuration.';
    } else if (response.status === 404) {
      errorMessage = 'Shipment or rate not found. The shipment may have expired.';
    } else if (response.status === 429) {
      errorMessage = 'API rate limit exceeded. Please wait a few minutes before trying again.';
    } else if (responseText.includes('rate-limited') || responseText.includes('RATE_LIMITED')) {
      errorMessage = 'API rate limit exceeded. Please wait a few minutes before trying again.';
    }
    
    throw new Error(errorMessage);
  }
  
  return responseData;
}

serve(async (req) => {
  try {
    console.log('=== PURCHASE LABEL v3.0 FUNCTION START ===');
    console.log('Request method:', req.method);
  
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      console.log('Handling CORS preflight request');
      return handleCorsPreflightRequest();
    }
    console.log('Processing purchase-label request...')
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', authHeader ? 'YES' : 'NO');
    
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
    console.error('=== ERROR IN PURCHASE LABEL FUNCTION v3.0 ===');
    console.error('Error type:', typeof err);
    console.error('Error constructor:', err.constructor?.name);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
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
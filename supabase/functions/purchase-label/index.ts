import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

console.log('=== PURCHASE-LABEL v6.0 ROBUST STARTUP ===')

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function createErrorResponse(error: string, details?: any, status: number = 500): Response {
  console.log('🔴 Creating error response:', error, details)
  return new Response(JSON.stringify({ error, details }), {
    headers: corsHeaders,
    status,
  });
}

function createSuccessResponse(data: any): Response {
  console.log('🟢 Creating success response')
  return new Response(JSON.stringify(data), {
    headers: corsHeaders,
    status: 200,
  });
}

async function purchaseShippingLabel(shipmentId: string, rateId: string, apiKey: string) {
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
    throw new Error(responseData.error?.message || 'Failed to purchase label');
  }
  
  return responseData;
}

serve(async (req) => {
  console.log('=== PURCHASE LABEL v6.0 ROBUST FUNCTION START ===');
  console.log('Request method:', req.method);
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log('Processing purchase-label request...')
    
    // Check environment variable first
    console.log('🔑 Checking EASYPOST_API_KEY...')
    const apiKey = Deno.env.get('EASYPOST_API_KEY')
    if (!apiKey) {
      console.error('❌ EASYPOST_API_KEY environment variable not found');
      return createErrorResponse('EasyPost API key not configured', 'Please ensure EASYPOST_API_KEY is set in environment variables', 500);
    }
    console.log('✅ EasyPost API key is configured');
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('📥 Request body parsed:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return createErrorResponse('Invalid JSON in request body', parseError.message, 400);
    }
    
    const { shipmentId, rateId, orderId } = requestBody;
    
    if (!shipmentId || !rateId) {
      console.error('❌ Missing required parameters:', { shipmentId, rateId });
      return createErrorResponse('Missing required parameters: shipmentId and rateId are required', null, 400);
    }
    
    console.log(`📦 Purchasing label for shipment ${shipmentId} with rate ${rateId}${orderId ? ` for order ${orderId}` : ''}`);

    // Purchase label from EasyPost
    console.log('📡 Calling EasyPost API...');
    const purchaseResponse = await purchaseShippingLabel(shipmentId, rateId, apiKey);
    console.log('✅ Label purchased successfully from EasyPost:', purchaseResponse.id);
    
    console.log('🎉 Returning successful response');
    return createSuccessResponse(purchaseResponse);
    
  } catch (err) {
    console.error('💥 === ERROR IN PURCHASE LABEL FUNCTION v6.0 ===');
    console.error('Error type:', typeof err);
    console.error('Error constructor:', err.constructor?.name);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    console.log('🔴 Returning generic error response');
    return createErrorResponse('Internal server error', err.message, 500);
  }
})
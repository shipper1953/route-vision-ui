import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { saveShipmentToDatabase } from './shipmentService.ts'
import { linkShipmentToOrder } from './orderService.ts'

console.log('=== PURCHASE-LABEL v8.0 WITH ORDER LINKING ===')

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function createErrorResponse(error: string, details?: any, status: number = 500): Response {
  console.log('🔴 Creating error response:', error, details)
  return new Response(JSON.stringify({ error, details }), {
    headers: corsHeaders,
    status,
  })
}

function createSuccessResponse(data: any): Response {
  console.log('🟢 Creating success response')
  return new Response(JSON.stringify(data), {
    headers: corsHeaders,
    status: 200,
  })
}

async function purchaseShippingLabel(shipmentId: string, rateId: string, apiKey: string) {
  console.log('🚚 Purchasing label for shipment:', shipmentId, 'with rate:', rateId)
  
  const response = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}/buy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      rate: { id: rateId }
    }),
  })
  
  const responseText = await response.text()
  let responseData
  
  try {
    responseData = JSON.parse(responseText)
  } catch (err) {
    responseData = { raw_response: responseText }
  }
  
  if (!response.ok) {
    console.error('❌ EasyPost API error:', responseData)
    throw new Error(responseData.error?.message || 'Failed to purchase label')
  }
  
  console.log('✅ Label purchased successfully')
  return responseData
}

serve(async (req) => {
  console.log('=== PURCHASE LABEL v8.0 FUNCTION START ===')
  console.log('Request method:', req.method)
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    console.log('Processing purchase-label request...')
    
    // Get authorization header for user authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      console.error('❌ Missing authorization header')
      return createErrorResponse('Unauthorized', 'Authorization header required', 401)
    }
    
    // Check environment variables
    console.log('🔑 Checking environment variables...')
    const apiKey = Deno.env.get('EASYPOST_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!apiKey || !supabaseUrl || !supabaseKey) {
      console.error('❌ Missing required environment variables')
      return createErrorResponse('Configuration error', 'Required environment variables not configured', 500)
    }
    console.log('✅ Environment variables configured')
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    
    // Get user from auth header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Failed to authenticate user:', authError)
      return createErrorResponse('Unauthorized', 'Invalid authorization token', 401)
    }
    
    console.log('✅ User authenticated:', user.id)
    
    // Parse request body
    let requestBody
    try {
      requestBody = await req.json()
      console.log('📥 Request body parsed:', JSON.stringify(requestBody, null, 2))
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return createErrorResponse('Invalid JSON in request body', parseError.message, 400)
    }
    
    const { shipmentId, rateId, orderId } = requestBody
    
    if (!shipmentId || !rateId) {
      console.error('❌ Missing required parameters:', { shipmentId, rateId })
      return createErrorResponse('Missing required parameters: shipmentId and rateId are required', null, 400)
    }
    
    console.log(`📦 Purchasing label for shipment ${shipmentId} with rate ${rateId}${orderId ? ` for order ${orderId}` : ''}`)

    // Purchase label from EasyPost
    console.log('📡 Calling EasyPost API...')
    const purchaseResponse = await purchaseShippingLabel(shipmentId, rateId, apiKey)
    console.log('✅ Label purchased successfully from EasyPost:', purchaseResponse.id)
    
    // Save shipment to database
    console.log('💾 Saving shipment to database...')
    const { finalShipmentId } = await saveShipmentToDatabase(purchaseResponse, orderId, user.id)
    console.log('✅ Shipment saved to database with ID:', finalShipmentId)
    
    // Link order to shipment if orderId provided
    if (orderId && finalShipmentId) {
      console.log('🔗 Linking order to shipment...')
      const linkSuccess = await linkShipmentToOrder(supabase, orderId, finalShipmentId)
      if (linkSuccess) {
        console.log('✅ Order successfully linked to shipment')
      } else {
        console.log('⚠️ Order linking failed, but shipment was created')
      }
    }
    
    console.log('🎉 Returning successful response')
    return createSuccessResponse({
      ...purchaseResponse,
      shipment_id: finalShipmentId,
      order_linked: orderId ? true : false
    })
    
  } catch (err) {
    console.error('💥 === ERROR IN PURCHASE LABEL FUNCTION v8.0 ===')
    console.error('Error type:', typeof err)
    console.error('Error constructor:', err.constructor?.name)
    console.error('Error message:', err.message)
    console.error('Error stack:', err.stack)
    
    console.log('🔴 Returning generic error response')
    return createErrorResponse('Internal server error', err.message, 500)
  }
})
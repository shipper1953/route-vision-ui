import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { saveShipmentToDatabase } from './shipmentService.ts'
import { linkShipmentToOrder } from './orderService.ts'
import { processWalletPayment } from './walletService.ts'

console.log('=== PURCHASE-LABEL v8.0 WITH ORDER LINKING ===')

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
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

async function purchaseShippoLabel(shipmentId: string, rateId: string, apiKey: string) {
  console.log('🚚 === PURCHASING SHIPPO LABEL ===')
  console.log('🚚 Shipment ID:', shipmentId)
  console.log('🚚 Rate ID:', rateId)
  console.log('🚚 API Key configured:', apiKey ? 'YES' : 'NO')
  
  const requestBody = {
    rate: rateId,
    async: false
  };
  
  console.log('📦 Shippo transaction request body:', JSON.stringify(requestBody, null, 2))
  
  const response = await fetch(`https://api.goshippo.com/transactions/`, {
    method: 'POST',
    headers: {
      'Authorization': `ShippoToken ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })
  
  console.log('🌐 Shippo API response status:', response.status)
  console.log('🌐 Shippo API response headers:', Object.fromEntries(response.headers.entries()))
  
  const responseText = await response.text()
  console.log('📥 Raw Shippo response text:', responseText)
  
  let responseData
  
  try {
    responseData = JSON.parse(responseText)
    console.log('📊 Parsed Shippo response data:', JSON.stringify(responseData, null, 2))
  } catch (err) {
    console.error('❌ Failed to parse Shippo response as JSON:', err)
    responseData = { raw_response: responseText, parse_error: err.message }
  }
  
  if (!response.ok) {
    console.error('❌ Shippo API HTTP error - Status:', response.status)
    console.error('❌ Shippo API HTTP error - Response:', responseData)
    throw new Error(responseData.detail || responseData.message || `Shippo API error: ${response.status}`)
  }
  
  // Check if Shippo transaction was successful
  if (responseData.status === 'ERROR') {
    console.error('❌ Shippo transaction status ERROR')
    console.error('❌ Shippo transaction messages:', responseData.messages)
    const errorMessages = responseData.messages?.map((msg: any) => msg.text).join('; ') || 'Unknown error';
    
    // For address validation errors, provide more helpful message
    if (errorMessages.includes('address') || errorMessages.includes('Address')) {
      console.error('❌ Address validation error detected:', errorMessages)
      throw new Error(`Address validation failed: ${errorMessages}. Please verify the shipping address is complete and correct.`)
    }
    
    throw new Error(`Shippo label creation failed: ${errorMessages}`)
  }
  
  if (!responseData.label_url) {
    console.error('❌ Shippo label URL missing from response')
    console.error('❌ Response data:', responseData)
    const warningMessages = responseData.messages?.map((msg: any) => msg.text).join('; ') || 'No additional details';
    throw new Error(`Shippo label was created but no label URL was provided. Messages: ${warningMessages}`)
  }
  
  console.log('✅ Shippo label purchased successfully')
  console.log('✅ Label URL:', responseData.label_url)
  console.log('✅ Tracking number:', responseData.tracking_number)
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
    
    // Skip auth validation since this is a trusted internal function
    console.log('✅ Proceeding without authentication validation')
    
    // Check environment variables
    console.log('🔑 Checking environment variables...')
    const apiKey = Deno.env.get('EASYPOST_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!apiKey || !supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('❌ Missing required environment variables')
      return createErrorResponse('Configuration error', 'Required environment variables not configured', 500)
    }
    console.log('✅ Environment variables configured')
    
    // Parse request body
    let requestBody
    try {
      requestBody = await req.json()
      console.log('📥 Request body parsed:', JSON.stringify(requestBody, null, 2))
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return createErrorResponse('Invalid JSON in request body', parseError.message, 400)
    }
    
    const { shipmentId, rateId, orderId, provider, selectedBox } = requestBody
    
    if (!shipmentId || !rateId) {
      console.error('❌ Missing required parameters:', { shipmentId, rateId })
      return createErrorResponse('Missing required parameters: shipmentId and rateId are required', null, 400)
    }
    
    console.log(`📦 Purchasing label for shipment ${shipmentId} with rate ${rateId}${orderId ? ` for order ${orderId}` : ''} using ${provider || 'easypost'}`)

    // Purchase label from the appropriate provider
    let purchaseResponse
    if (provider === 'shippo') {
      console.log('📡 Calling Shippo API...')
      const shippoApiKey = Deno.env.get('SHIPPO_API_KEY')
      if (!shippoApiKey) {
        console.error('❌ Missing Shippo API key')
        return createErrorResponse('Shippo API key not configured', null, 500)
      }
      purchaseResponse = await purchaseShippoLabel(shipmentId, rateId, shippoApiKey)
      console.log('✅ Label purchased successfully from Shippo:', purchaseResponse.object_id)
    } else {
      console.log('📡 Calling EasyPost API...')
      purchaseResponse = await purchaseShippingLabel(shipmentId, rateId, apiKey)
      console.log('✅ Label purchased successfully from EasyPost:', purchaseResponse.id)
    }
    
    // Create Supabase client with service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    
    // Determine company_id for wallet processing. Prefer order.company_id when orderId is provided.
    let companyIdForWallet: string | null = null;
    const defaultUserId = "00be6af7-a275-49fe-842f-1bd402bf113b" // TODO: replace when auth is wired in

    if (orderId) {
      const numericOrderId = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;
      console.log('🔎 Looking up order company_id for order:', numericOrderId);
      const { data: orderRow, error: orderErr } = await supabase
        .from('orders')
        .select('company_id')
        .eq('id', numericOrderId)
        .maybeSingle();
      if (orderErr) {
        console.error('❌ Failed to fetch order for company_id:', orderErr);
      } else if (orderRow?.company_id) {
        companyIdForWallet = orderRow.company_id;
        console.log('✅ Using company_id from order:', companyIdForWallet);
      } else {
        console.warn('⚠️ Order found but company_id missing');
      }
    }

    // Fallback to default user profile company if order lookup failed
    if (!companyIdForWallet) {
      console.log('ℹ️ Falling back to default user company for wallet processing');
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', defaultUserId)
        .maybeSingle();

      if (userError || !userProfile?.company_id) {
        console.error('❌ Could not resolve company_id for wallet processing:', userError);
        return createErrorResponse('User profile not found or not assigned to a company', null, 400);
      }
      companyIdForWallet = userProfile.company_id;
      console.log('✅ Using fallback company_id:', companyIdForWallet);
    }

    // Process wallet payment
    const labelCost = provider === 'shippo' 
      ? parseFloat(purchaseResponse.rate?.amount || '0')
      : parseFloat(purchaseResponse.selected_rate?.rate || '0');
    
    const purchaseResponseId = provider === 'shippo' 
      ? purchaseResponse.object_id 
      : purchaseResponse.id;

    console.log('💰 Processing wallet payment for company:', companyIdForWallet)
    await processWalletPayment(companyIdForWallet, labelCost, defaultUserId, purchaseResponseId);
    console.log('✅ Wallet payment processed successfully')
    
    // Save shipment to database
    console.log('💾 Saving shipment to database...')
    console.log('📦 Selected box info:', selectedBox)
    const { finalShipmentId } = await saveShipmentToDatabase(purchaseResponse, orderId, defaultUserId, provider || 'easypost', selectedBox)
    console.log('✅ Shipment saved to database with ID:', finalShipmentId)
    
    // Link order to shipment if orderId provided
    if (orderId && finalShipmentId) {
      console.log('🔗 Linking order to shipment...')
      const linkSuccess = await linkShipmentToOrder(supabase, orderId, finalShipmentId)
      if (linkSuccess) {
        console.log('✅ Order successfully linked to shipment')
        // Fire Slack notification for "order shipped"
        try {
          const slackWebhook = Deno.env.get('SLACK_WEBHOOK_URL')
          if (!slackWebhook) {
            console.log('ℹ️ SLACK_WEBHOOK_URL not configured, skipping Slack alert')
          } else {
            const carrier = provider === 'shippo'
              ? (purchaseResponse.rate?.provider || purchaseResponse.carrier_account || 'Unknown')
              : (purchaseResponse.selected_rate?.carrier || 'Unknown')
            const service = provider === 'shippo'
              ? (purchaseResponse.rate?.servicelevel?.name || purchaseResponse.servicelevel?.name || 'Unknown')
              : (purchaseResponse.selected_rate?.service || 'Unknown')
            const tracking = provider === 'shippo'
              ? (purchaseResponse.tracking_number || purchaseResponse.tracking_code || 'N/A')
              : (purchaseResponse.tracking_code || purchaseResponse.tracking_number || 'N/A')
            const trackUrl = provider === 'shippo'
              ? (purchaseResponse.tracking_url_provider || purchaseResponse.label_url)
              : (purchaseResponse.tracker?.public_url || purchaseResponse.postage_label?.label_url)
            const est = provider === 'shippo'
              ? (purchaseResponse.rate?.estimated_days ? `${purchaseResponse.rate.estimated_days} days` : null)
              : (purchaseResponse.tracker?.est_delivery_date || null)

            const text = `:truck: Order ${orderId} shipped via ${carrier} ${service}\nTracking: ${tracking}${trackUrl ? ` • ${trackUrl}` : ''}${est ? `\nETA: ${est}` : ''}`
            const slackBody: Record<string, unknown> = {
              username: 'Shipping Bot',
              icon_emoji: ':truck:',
              text,
            }

            const slackResp = await fetch(slackWebhook, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(slackBody),
            })
            if (!slackResp.ok) {
              const errText = await slackResp.text()
              console.error('❌ Slack webhook error:', slackResp.status, errText)
            } else {
              console.log('✅ Slack shipped alert sent')
            }
          }
        } catch (slackErr) {
          console.error('⚠️ Failed to send Slack shipped alert:', slackErr)
        }
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
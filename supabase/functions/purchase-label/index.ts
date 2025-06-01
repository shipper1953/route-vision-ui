
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { saveShipmentToDatabase } from './shipmentService.ts'
import { linkShipmentToOrder } from './orderService.ts'

const easyPostApiKey = Deno.env.get('EASYPOST_API_KEY')

console.log('EasyPost API key available in purchase-label function:', easyPostApiKey ? 'YES' : 'NO')

serve(async (req) => {
  // Set up CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // In production, set this to your actual domain
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  }

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers, status: 204 })
  }

  // Set up Supabase client with auth context
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )
  
  // Verify authenticated user
  const { data, error } = await supabaseClient.auth.getUser()
  if (error || !data.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers,
      status: 401,
    })
  }

  try {
    const { shipmentId, rateId, orderId } = await req.json()
    
    if (!shipmentId || !rateId) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters',
      }), {
        headers,
        status: 400,
      })
    }
    
    console.log(`Purchasing label for shipment ${shipmentId} with rate ${rateId}` + (orderId ? ` for order ${orderId}` : ''))
    
    // Call EasyPost API to purchase the label
    const response = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}/buy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${easyPostApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        rate: { id: rateId }
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('EasyPost API error:', errorData)
      return new Response(JSON.stringify({
        error: 'EasyPost API error',
        details: errorData
      }), {
        headers,
        status: response.status,
      })
    }
    
    const purchaseResponse = await response.json()
    
    // Save shipment to database (this function has been updated to remove order_id field)
    const { finalShipmentId, supabaseClient: dbClient } = await saveShipmentToDatabase(purchaseResponse, orderId)
    
    // If we have an orderId, link the shipment to the order
    if (orderId && finalShipmentId) {
      try {
        await linkShipmentToOrder(dbClient, orderId, finalShipmentId)
        console.log(`Successfully linked shipment ${purchaseResponse.id} to order ${orderId}`)
      } catch (linkError) {
        console.error('Error linking shipment to order:', linkError)
        // Don't fail the whole operation if linking fails
      }
    }
    
    // Update shipment status in database
    const { error: updateError } = await supabaseClient
      .from('shipments')
      .update({
        status: 'purchased',
        label_url: purchaseResponse.postage_label?.label_url,
        tracking_number: purchaseResponse.tracking_code,
      })
      .eq('easypost_id', shipmentId)
      .eq('user_id', data.user.id)
    
    if (updateError) {
      console.error('Error updating shipment in database:', updateError)
    }
    
    return new Response(JSON.stringify(purchaseResponse), { headers })
    
  } catch (err) {
    console.error('Error processing request:', err)
    return new Response(JSON.stringify({ error: 'Internal server error', details: err.message }), {
      headers,
      status: 500,
    })
  }
})

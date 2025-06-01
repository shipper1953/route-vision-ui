
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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers, status: 204 })
  }

  try {
    console.log('Processing purchase-label request...')
    
    // Create Supabase client with the correct auth context
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', authHeader ? 'YES' : 'NO')
    
    if (!authHeader) {
      console.error('No authorization header found in request')
      return new Response(JSON.stringify({ 
        error: 'No authorization header provided',
        details: 'Please ensure you are logged in' 
      }), {
        headers,
        status: 401,
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )
    
    // Verify authenticated user
    console.log('Verifying user authentication...')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError) {
      console.error('Auth verification error:', authError)
      return new Response(JSON.stringify({ 
        error: 'Authentication verification failed', 
        details: authError.message 
      }), {
        headers,
        status: 401,
      })
    }
    
    if (!user) {
      console.error('No user found after auth verification')
      return new Response(JSON.stringify({ 
        error: 'User not authenticated',
        details: 'No user found in session' 
      }), {
        headers,
        status: 401,
      })
    }

    console.log('User authenticated successfully:', user.email)

    const { shipmentId, rateId, orderId } = await req.json()
    
    if (!shipmentId || !rateId) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters: shipmentId and rateId are required',
      }), {
        headers,
        status: 400,
      })
    }
    
    console.log(`Purchasing label for shipment ${shipmentId} with rate ${rateId}` + (orderId ? ` for order ${orderId}` : ''))
    
    if (!easyPostApiKey) {
      return new Response(JSON.stringify({
        error: 'EasyPost API key not configured',
        details: 'Please ensure EASYPOST_API_KEY is set in environment variables'
      }), {
        headers,
        status: 500,
      })
    }
    
    // Call EasyPost API to purchase the label
    console.log('Calling EasyPost API...')
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
      
      // Provide more specific error messages
      let errorMessage = 'EasyPost API error'
      if (errorData.error?.message) {
        errorMessage = errorData.error.message
      } else if (response.status === 422) {
        errorMessage = 'Invalid shipment or rate data. Please check your shipment configuration.'
      } else if (response.status === 401) {
        errorMessage = 'Invalid EasyPost API key. Please check your configuration.'
      } else if (response.status === 404) {
        errorMessage = 'Shipment or rate not found. The shipment may have expired.'
      }
      
      return new Response(JSON.stringify({
        error: errorMessage,
        details: errorData,
        statusCode: response.status
      }), {
        headers,
        status: response.status,
      })
    }
    
    const purchaseResponse = await response.json()
    console.log('Label purchased successfully from EasyPost:', purchaseResponse.id)
    
    // Save shipment to database
    try {
      const { finalShipmentId } = await saveShipmentToDatabase(purchaseResponse, orderId)
      
      // If we have an orderId, link the shipment to the order
      if (orderId && finalShipmentId) {
        try {
          await linkShipmentToOrder(supabaseClient, orderId, finalShipmentId)
          console.log(`Successfully linked shipment ${purchaseResponse.id} to order ${orderId}`)
        } catch (linkError) {
          console.error('Error linking shipment to order:', linkError)
          // Don't fail the whole operation if linking fails
        }
      }
    } catch (dbError) {
      console.error('Database save error:', dbError)
      // Don't fail the label purchase if database save fails
    }
    
    // Update shipment status in database
    try {
      const { error: updateError } = await supabaseClient
        .from('shipments')
        .update({
          status: 'purchased',
          label_url: purchaseResponse.postage_label?.label_url,
          tracking_number: purchaseResponse.tracking_code,
        })
        .eq('easypost_id', shipmentId)
        .eq('user_id', user.id)
      
      if (updateError) {
        console.error('Error updating shipment in database:', updateError)
      } else {
        console.log('Successfully updated shipment status in database')
      }
    } catch (updateErr) {
      console.error('Failed to update shipment status:', updateErr)
    }
    
    console.log('Returning successful response')
    return new Response(JSON.stringify(purchaseResponse), { headers })
    
  } catch (err) {
    console.error('Error processing request:', err)
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: err.message,
      stack: err.stack 
    }), {
      headers,
      status: 500,
    })
  }
})

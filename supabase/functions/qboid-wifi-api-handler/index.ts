
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Received OPTIONS request to qboid-wifi-api-handler endpoint')
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  console.log('Received POST request to qboid-wifi-api-handler endpoint')

  try {
    // Parse the request body
    const body = await req.text()
    console.log('Received body:', body)

    let qboidData
    try {
      qboidData = JSON.parse(body)
    } catch (parseError) {
      console.error('Failed to parse JSON body:', parseError)
      return new Response('Invalid JSON', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    console.log('Received data from Qboid device:', qboidData)

    // Get the API token from request headers or body
    const authHeader = req.headers.get('authorization')
    const apiToken = authHeader?.replace('Bearer ', '') || qboidData.token
    
    console.log('Received token:', apiToken ? 'Token provided' : 'null')

    // Validate API token
    const expectedToken = Deno.env.get('QBOID_API_TOKEN')
    if (!expectedToken) {
      console.error('QBOID_API_TOKEN not configured in environment')
      return new Response('Server configuration error', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    if (!apiToken || apiToken !== expectedToken) {
      console.error('Missing or invalid Qboid API token')
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    // Handle token validation requests
    if (qboidData.action === 'validate-token') {
      console.log('Token validation request - token is valid')
      return new Response(JSON.stringify({ status: 'valid' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate that we have the required qboid measurement data
    if (!qboidData.l || !qboidData.w || !qboidData.h || !qboidData.weight) {
      console.error('Invalid Qboid data format - missing required fields')
      return new Response('Invalid data format', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    console.log('Parsed qboid data:', qboidData)

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    console.log('Creating Supabase client with URL:', supabaseUrl ? 'URL provided' : 'No URL')
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Convert qboid measurements to standard format (convert mm to inches, grams to oz)
    const dimensions = {
      length: parseFloat((qboidData.l / 25.4).toFixed(2)), // mm to inches
      width: parseFloat((qboidData.w / 25.4).toFixed(2)),   // mm to inches  
      height: parseFloat((qboidData.h / 25.4).toFixed(2)),  // mm to inches
      weight: parseFloat((qboidData.weight / 28.35).toFixed(2)) // grams to oz
    }

    // If we have an order barcode, update the order with dimensions
    if (qboidData.barcode) {
      console.log('Updating order with Qboid dimensions:', qboidData.barcode)
      
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          qboid_dimensions: dimensions 
        })
        .eq('order_id', qboidData.barcode)

      if (orderError) {
        console.error('Error updating order:', orderError)
      } else {
        console.log('Order updated successfully with Qboid dimensions')
      }
    }

    console.log('Saving dimensions to database:', dimensions)

    // Save to shipments table (this will be used for shipment creation)
    const { error: shipmentError } = await supabase
      .from('shipments')
      .insert({
        carrier: 'qboid-measurement',
        service: 'measurement',
        status: 'measured',
        cost: 0,
        package_dimensions: dimensions,
        package_weights: { weight: dimensions.weight, weight_unit: 'oz' },
        user_id: null // Service role can insert without user context
      })

    if (shipmentError) {
      console.error('Error saving dimensions to database:', shipmentError)
    }

    console.log('Publishing realtime event for dimensions:', dimensions)

    // Publish realtime event to qboid_events table
    const eventData = {
      dimensions,
      orderId: qboidData.barcode || null,
      timestamp: new Date().toISOString(),
      device: qboidData.device || 'unknown'
    }

    const { error: eventError } = await supabase
      .from('qboid_events')
      .insert({
        event_type: 'dimensions_received',
        data: eventData
      })

    if (eventError) {
      console.error('Error publishing realtime event:', eventError)
    } else {
      console.log('Realtime event published successfully')
    }

    // Return success response
    return new Response(JSON.stringify({ 
      status: 'success', 
      dimensions,
      orderId: qboidData.barcode 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error processing qboid data:', error)
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})

console.log('Qboid WiFi API handler loaded')

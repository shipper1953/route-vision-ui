
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const easyPostApiKey = Deno.env.get('EASYPOST_API_KEY')

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*', // In production, set this to your specific domain
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    })
  }

  // Set up Supabase client with auth context from request
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )
  
  // Verify authenticated user
  const { data, error } = await supabaseClient.auth.getUser()
  if (error || !data.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: corsHeaders,
      status: 401,
    })
  }

  try {
    const { shipmentData } = await req.json()
    
    // Enable SmartRate by adding the right options
    if (!shipmentData.options) {
      shipmentData.options = {}
    }
    
    // Add SmartRate options if not already present
    shipmentData.options.smartrate_accuracy = shipmentData.options.smartrate_accuracy || 'percentile_95'
    
    console.log('Creating shipment with data:', JSON.stringify(shipmentData, null, 2))
    
    const response = await fetch('https://api.easypost.com/v2/shipments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${easyPostApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shipment: shipmentData }),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('EasyPost API error:', errorData)
      return new Response(JSON.stringify({
        error: 'EasyPost API error',
        details: errorData
      }), {
        headers: corsHeaders,
        status: response.status,
      })
    }
    
    const shipmentResponse = await response.json()
    
    // Save the shipment information to Supabase
    const { data: savedShipment, error: saveError } = await supabaseClient
      .from('shipments')
      .insert({
        user_id: data.user.id,
        easypost_id: shipmentResponse.id,
        to_address: shipmentData.to_address,
        from_address: shipmentData.from_address,
        parcel: shipmentData.parcel,
        rates: shipmentResponse.rates || [],
        smartrates: shipmentResponse.smartrates || [],
        order_id: shipmentData.reference || null,
        status: 'created'
      })
      .select()
      .single()
    
    if (saveError) {
      console.error('Error saving shipment to database:', saveError)
    }
    
    // Return the EasyPost response
    return new Response(JSON.stringify(shipmentResponse), { headers: corsHeaders })
    
  } catch (err) {
    console.error('Error processing request:', err)
    return new Response(JSON.stringify({ error: 'Internal server error', details: err.message }), {
      headers: corsHeaders,
      status: 500,
    })
  }
})

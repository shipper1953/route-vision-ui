
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
  console.log('Create-shipment function invoked')
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request')
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    })
  }

  try {
    console.log('Processing shipment request')
    
    // Create Supabase client without requiring authorization
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { 
            // Do not include Authorization header to avoid 401 errors
          } 
        } 
      }
    )
    
    // Parse request JSON
    const requestData = await req.json()
    const shipmentData = requestData.shipmentData
    
    if (!shipmentData) {
      console.error('No shipment data provided in request')
      return new Response(
        JSON.stringify({ error: 'No shipment data provided' }), 
        { headers: corsHeaders, status: 400 }
      )
    }
    
    // Ensure we have options
    if (!shipmentData.options) {
      shipmentData.options = {}
    }
    
    // Always enable SmartRate with a high accuracy level for best delivery estimates
    // percentile_95 provides a good balance of accuracy and coverage
    shipmentData.options.smartrate_accuracy = shipmentData.options.smartrate_accuracy || 'percentile_95'
    
    console.log('Creating shipment with data:', JSON.stringify(shipmentData, null, 2))
    
    if (!easyPostApiKey) {
      console.error('EasyPost API key is not configured in environment variables')
      return new Response(
        JSON.stringify({ error: 'EasyPost API key is not available. Please configure it in Supabase Secrets.' }), 
        { headers: corsHeaders, status: 500 }
      )
    }
    
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
      console.error('EasyPost API error:', JSON.stringify(errorData, null, 2))
      return new Response(JSON.stringify({
        error: 'EasyPost API error',
        details: errorData
      }), {
        headers: corsHeaders,
        status: response.status,
      })
    }
    
    const shipmentResponse = await response.json()
    console.log('SmartRates received:', shipmentResponse.smartrates ? shipmentResponse.smartrates.length : 0)
    
    // Save the shipment information to Supabase if a user is logged in
    try {
      const authResponse = await supabaseClient.auth.getUser()
      if (!authResponse.error && authResponse.data.user) {
        const { error: saveError } = await supabaseClient
          .from('shipments')
          .insert({
            user_id: authResponse.data.user.id,
            easypost_id: shipmentResponse.id,
            to_address: shipmentData.to_address,
            from_address: shipmentData.from_address,
            parcel: shipmentData.parcel,
            rates: shipmentResponse.rates || [],
            smartrates: shipmentResponse.smartrates || [],
            order_id: shipmentData.reference || null,
            status: 'created'
          })
        
        if (saveError) {
          console.error('Error saving shipment to database:', saveError)
        }
      }
    } catch (saveErr) {
      // Don't fail the request if we can't save to the database
      console.error('Error when trying to save shipment:', saveErr)
    }
    
    // Return the EasyPost response with proper CORS headers
    console.log('Returning successful response')
    return new Response(JSON.stringify(shipmentResponse), { headers: corsHeaders })
    
  } catch (err) {
    console.error('Error processing request:', err)
    return new Response(JSON.stringify({ error: 'Internal server error', details: err.message }), {
      headers: corsHeaders,
      status: 500,
    })
  }
})

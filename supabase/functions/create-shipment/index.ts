
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const easyPostApiKey = Deno.env.get('EASYPOST_API_KEY')

console.log('EasyPost API key available in Edge Function:', easyPostApiKey ? 'YES' : 'NO')

serve(async (req) => {
  console.log('Create-shipment function invoked')
  
  // Set up CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request')
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    console.log('Processing shipment request')
    console.log('API Key available:', easyPostApiKey ? 'Yes' : 'No')
    
    if (!easyPostApiKey) {
      return new Response(JSON.stringify({
        error: 'EasyPost API key not configured'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const { shipmentData } = await req.json()
    
    // Enhanced SmartRate configuration
    if (!shipmentData.options) {
      shipmentData.options = {}
    }
    
    // Set SmartRate accuracy to a more reliable level
    shipmentData.options.smartrate_accuracy = shipmentData.options.smartrate_accuracy || 'percentile_75'
    
    console.log('SmartRate configuration:', {
      smartrate_accuracy: shipmentData.options.smartrate_accuracy,
      options: shipmentData.options
    })
    
    console.log('Creating shipment with data:', JSON.stringify(shipmentData, null, 2))
    
    // Call EasyPost API to create shipment
    const response = await fetch('https://api.easypost.com/v2/shipments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${easyPostApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shipment: shipmentData
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('EasyPost API error:', errorData)
      
      let errorMessage = 'Failed to create shipment'
      if (errorData.error?.message) {
        errorMessage = errorData.error.message
      } else if (response.status === 422) {
        errorMessage = 'Invalid shipment data. Please check addresses and package dimensions.'
      } else if (response.status === 401) {
        errorMessage = 'Invalid EasyPost API key'
      }
      
      return new Response(JSON.stringify({
        error: errorMessage,
        details: errorData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      })
    }
    
    const shipmentResponse = await response.json()
    
    console.log('EasyPost API Response Summary:')
    console.log('- Shipment ID:', shipmentResponse.id)
    console.log('- SmartRates received:', shipmentResponse.smartRates ? shipmentResponse.smartRates.length : 0)
    console.log('- Standard Rates received:', shipmentResponse.rates ? shipmentResponse.rates.length : 0)
    
    // If no SmartRates, try to get them with a separate call
    if ((!shipmentResponse.smartRates || shipmentResponse.smartRates.length === 0) && 
        shipmentResponse.rates && shipmentResponse.rates.length > 0) {
      
      console.log('⚠️ NO SMARTRATES RETURNED - This might indicate:')
      console.error('  1. SmartRate not enabled for this EasyPost account')
      console.error('  2. No carrier accounts configured')
      console.error('  3. Address combination not supported')
      console.error('  4. Package specifications outside SmartRate coverage')
      
      console.log('Attempting to get SmartRates with different accuracy level...')
      
      try {
        const smartRateResponse = await fetch(`https://api.easypost.com/v2/shipments/${shipmentResponse.id}/smartrates`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${easyPostApiKey}`,
            'Content-Type': 'application/json',
          }
        })
        
        if (smartRateResponse.ok) {
          const smartRateData = await smartRateResponse.json()
          if (smartRateData.smartrates && smartRateData.smartrates.length > 0) {
            shipmentResponse.smartRates = smartRateData.smartrates
            console.log('✅ Successfully retrieved SmartRates via GET:', smartRateData.smartrates.length)
          }
        } else {
          const smartRateError = await smartRateResponse.json()
          console.error('SmartRate endpoint error:', smartRateError)
        }
      } catch (smartRateErr) {
        console.error('Error calling SmartRate GET endpoint:', smartRateErr)
      }
    }
    
    // Try to save to database if user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        )
        
        const { data: authData } = await supabaseClient.auth.getUser()
        if (authData?.user) {
          console.log('Authenticated user found, saving shipment to database')
          
          const shipmentDbData = {
            easypost_id: shipmentResponse.id,
            user_id: authData.user.id,
            status: 'created',
            from_address: JSON.stringify(shipmentData.from_address),
            to_address: JSON.stringify(shipmentData.to_address),
            package_dimensions: JSON.stringify({
              length: shipmentData.parcel.length,
              width: shipmentData.parcel.width,
              height: shipmentData.parcel.height
            }),
            package_weights: JSON.stringify({
              weight: shipmentData.parcel.weight,
              weight_unit: 'oz'
            }),
            created_at: new Date().toISOString(),
          }
          
          const { error: insertError } = await supabaseClient
            .from('shipments')
            .insert(shipmentDbData)
          
          if (insertError) {
            console.error('Failed to save shipment to database:', insertError)
          } else {
            console.log('Shipment saved to database successfully')
          }
        }
      } catch (dbError) {
        console.error('Database operation failed:', dbError)
      }
    } else {
      console.log('No authenticated user, skipping database save')
    }
    
    console.log('Returning successful response')
    return new Response(JSON.stringify(shipmentResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    
  } catch (err) {
    console.error('Error in create-shipment function:', err)
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: err.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

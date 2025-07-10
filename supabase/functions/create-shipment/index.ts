
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// Force redeployment: v2.1
const easyPostApiKey = Deno.env.get('EASYPOST_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

console.log('=== CREATE-SHIPMENT FUNCTION STARTUP ===')
console.log('Environment variables check:')
console.log('- SUPABASE_URL:', supabaseUrl ? 'Available' : 'Missing')
console.log('- SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Available' : 'Missing')
console.log('- EASYPOST_API_KEY:', easyPostApiKey ? 'Available' : 'Missing')
console.log('==========================================')

if (!easyPostApiKey) {
  console.error('❌ CRITICAL: EASYPOST_API_KEY environment variable is not set!')
} else {
  console.log('✅ EASYPOST_API_KEY is properly configured')
}

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
    
    if (easyPostApiKey) {
      console.log('API Key first 10 chars:', easyPostApiKey.substring(0, 10))
    }
    
    if (!easyPostApiKey) {
      console.error('EASYPOST_API_KEY environment variable not found')
      return new Response(JSON.stringify({
        error: 'EasyPost API key not configured',
        details: 'EASYPOST_API_KEY environment variable is missing'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const { shipmentData } = await req.json()
    
    console.log('Received shipment data:', JSON.stringify(shipmentData, null, 2))
    
    // Validate required shipment data
    if (!shipmentData) {
      console.error('No shipment data provided')
      return new Response(JSON.stringify({
        error: 'Missing shipment data'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    
    if (!shipmentData.to_address || !shipmentData.from_address || !shipmentData.parcel) {
      console.error('Missing required shipment fields:', {
        to_address: !!shipmentData.to_address,
        from_address: !!shipmentData.from_address,
        parcel: !!shipmentData.parcel
      })
      return new Response(JSON.stringify({
        error: 'Missing required shipment fields (to_address, from_address, parcel)'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    
    // Standard rate configuration
    if (!shipmentData.options) {
      shipmentData.options = {}
    }
    
    // Set standard options
    shipmentData.options.currency = 'USD'
    shipmentData.options.delivery_confirmation = 'NO_SIGNATURE'
    
    console.log('Standard rate configuration:', {
      currency: shipmentData.options.currency,
      options: shipmentData.options
    })
    
    console.log('Creating shipment with standard rate data:', JSON.stringify(shipmentData, null, 2))
    
    // Call EasyPost API to create shipment with standard rates only
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
    console.log('- Standard Rates received:', shipmentResponse.rates ? shipmentResponse.rates.length : 0)
    
    if (!shipmentResponse.rates || shipmentResponse.rates.length === 0) {
      console.log('⚠️ No rates available for this shipment')
      return new Response(JSON.stringify({
        error: 'No shipping rates available. Please check your package dimensions and addresses.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    
    console.log('✅ FINAL RESULT: Standard rates available:', shipmentResponse.rates.length)
    
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
          
          // Get the user's company_id for proper data association
          const { data: userData } = await supabaseClient
            .from('users')
            .select('company_id')
            .eq('id', authData.user.id)
            .single()
          
          const shipmentDbData = {
            easypost_id: shipmentResponse.id,
            user_id: authData.user.id,
            company_id: userData?.company_id || null,
            carrier: 'UPS', // Default carrier
            service: 'Ground', // Default service
            status: 'created',
            package_dimensions: JSON.stringify({
              length: shipmentData.parcel.length,
              width: shipmentData.parcel.width,
              height: shipmentData.parcel.height
            }),
            package_weights: JSON.stringify({
              weight: shipmentData.parcel.weight,
              weight_unit: 'oz'
            }),
            rates: JSON.stringify(shipmentResponse.rates),
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
    
    console.log('Returning successful response with standard rates:', shipmentResponse.rates?.length || 0)
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

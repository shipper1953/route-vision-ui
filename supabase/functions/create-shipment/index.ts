import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// FORCE COMPLETE REDEPLOYMENT: v5.0 - Complete rebuild to fix EASYPOST_API_KEY access
console.log('=== CREATE-SHIPMENT FUNCTION v5.0 STARTUP ===')
console.log('Build timestamp:', new Date().toISOString())

// Environment variable access with whitespace cleanup
let easyPostApiKey = Deno.env.get('EASYPOST_API_KEY')
if (!easyPostApiKey) {
  // Try with potential whitespace/newlines
  const rawKey = Deno.env.get('EASYPOST_API_KEY\n\n') || Deno.env.get('EASYPOST_API_KEY\n')
  easyPostApiKey = rawKey?.trim()
}
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

// Comprehensive environment diagnostics
const allEnvVars = Deno.env.toObject()
const envKeys = Object.keys(allEnvVars)

console.log('=== ENVIRONMENT DIAGNOSTICS v5.0 ===')
console.log('Total environment variables:', envKeys.length)
console.log('Environment keys:', envKeys.sort())

// Specific checks for EASYPOST variables
const easypostKeys = envKeys.filter(key => key.includes('EASYPOST'))
console.log('EasyPost related keys found:', easypostKeys)

// Check all variations
const possibleKeys = [
  'EASYPOST_API_KEY',
  'EASYPOST_API_TOKEN', 
  'EASYPOST_KEY',
  'VITE_EASYPOST_API_KEY'
]

console.log('=== KEY AVAILABILITY CHECK ===')
possibleKeys.forEach(key => {
  const value = Deno.env.get(key)
  console.log(`${key}:`, value ? `AVAILABLE (${value.length} chars, starts with: ${value.substring(0, 5)})` : 'NOT FOUND')
})

console.log('=== SUPABASE CONFIG ===')
console.log('SUPABASE_URL:', supabaseUrl ? 'Available' : 'Missing')
console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Available' : 'Missing')

console.log('==========================================')

// Final determination
if (!easyPostApiKey) {
  console.error('❌ CRITICAL: EASYPOST_API_KEY is still not accessible')
  console.error('This indicates the Supabase secret is not being injected properly')
  console.error('Available env keys containing "API":', envKeys.filter(k => k.includes('API')))
  console.error('Available env keys containing "KEY":', envKeys.filter(k => k.includes('KEY')))
} else {
  console.log('✅ SUCCESS: EASYPOST_API_KEY is accessible')
  console.log('Key validation:', easyPostApiKey.startsWith('EZ') ? 'Valid EasyPost format' : 'WARNING: Invalid format')
}

serve(async (req) => {
  console.log('=== REQUEST RECEIVED ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  console.log('Timestamp:', new Date().toISOString())
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight')
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    // Re-check environment in request context with whitespace handling
    let currentEasyPostKey = Deno.env.get('EASYPOST_API_KEY')
    if (!currentEasyPostKey) {
      const rawKey = Deno.env.get('EASYPOST_API_KEY\n\n') || Deno.env.get('EASYPOST_API_KEY\n')
      currentEasyPostKey = rawKey?.trim()
    }
    console.log('In-request API key check:', currentEasyPostKey ? 'PRESENT' : 'MISSING')
    
    if (!currentEasyPostKey) {
      console.error('FATAL: EASYPOST_API_KEY not available during request processing')
      return new Response(JSON.stringify({
        error: 'EasyPost API key configuration error',
        details: 'EASYPOST_API_KEY environment variable is not accessible to the edge function',
        diagnostic: {
          functionVersion: '5.0',
          timestamp: new Date().toISOString(),
          envVarsTotal: Object.keys(Deno.env.toObject()).length,
          troubleshooting: 'The Supabase secret EASYPOST_API_KEY is not being injected into the edge function runtime'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const { shipmentData } = await req.json()
    console.log('Shipment data received, processing...')
    
    if (!shipmentData || !shipmentData.to_address || !shipmentData.from_address || !shipmentData.parcel) {
      console.error('Invalid shipment data structure')
      return new Response(JSON.stringify({
        error: 'Invalid shipment data',
        details: 'Missing required fields: to_address, from_address, or parcel'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    
    // Configure shipment options
    if (!shipmentData.options) {
      shipmentData.options = {}
    }
    shipmentData.options.currency = 'USD'
    shipmentData.options.delivery_confirmation = 'NO_SIGNATURE'
    
    console.log('Calling EasyPost API...')
    console.log('Using API key:', currentEasyPostKey.substring(0, 10) + '...')
    
    const response = await fetch('https://api.easypost.com/v2/shipments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentEasyPostKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shipment: shipmentData }),
    })
    
    console.log('EasyPost response status:', response.status)
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('EasyPost API error:', errorData)
      
      let errorMessage = 'Failed to create shipment'
      if (response.status === 401) {
        errorMessage = 'EasyPost API authentication failed - invalid API key'
      } else if (response.status === 422) {
        errorMessage = 'Invalid shipment data provided to EasyPost'
      } else if (errorData.error?.message) {
        errorMessage = errorData.error.message
      }
      
      return new Response(JSON.stringify({
        error: errorMessage,
        details: errorData,
        diagnostic: {
          status: response.status,
          apiKeyFormat: currentEasyPostKey.startsWith('EZ') ? 'valid' : 'invalid'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      })
    }
    
    const shipmentResponse = await response.json()
    console.log('✅ EasyPost success - Shipment ID:', shipmentResponse.id)
    console.log('Rates available:', shipmentResponse.rates?.length || 0)
    
    if (!shipmentResponse.rates?.length) {
      return new Response(JSON.stringify({
        error: 'No shipping rates available',
        details: 'EasyPost returned no rates for this shipment configuration'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    
    // Save to database if authenticated
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      try {
        const supabaseClient = createClient(
          supabaseUrl ?? '',
          supabaseAnonKey ?? '',
          { global: { headers: { Authorization: authHeader } } }
        )
        
        const { data: authData } = await supabaseClient.auth.getUser()
        if (authData?.user) {
          const { data: userData } = await supabaseClient
            .from('users')
            .select('company_id')
            .eq('id', authData.user.id)
            .single()
          
          const shipmentDbData = {
            easypost_id: shipmentResponse.id,
            user_id: authData.user.id,
            company_id: userData?.company_id || null,
            carrier: 'UPS',
            service: 'Ground',
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
            console.error('Database save failed:', insertError)
          } else {
            console.log('✅ Shipment saved to database')
          }
        }
      } catch (dbError) {
        console.error('Database operation error:', dbError)
      }
    }
    
    console.log('✅ Returning successful response')
    return new Response(JSON.stringify(shipmentResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    
  } catch (err) {
    console.error('❌ Function error:', err)
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: err.message,
      functionVersion: '5.0'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
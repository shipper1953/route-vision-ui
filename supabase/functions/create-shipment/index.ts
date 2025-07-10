import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// FORCE REDEPLOYMENT: v6.0 - Fix newline issue in EASYPOST_API_KEY
console.log('=== CREATE-SHIPMENT v6.0 - NEWLINE FIX ===')
console.log('Build timestamp:', new Date().toISOString())

// Fix for EASYPOST_API_KEY with newline characters
function getCleanEasyPostKey(): string | undefined {
  // Try clean key first
  let key = Deno.env.get('EASYPOST_API_KEY')
  if (key) {
    console.log('✅ Found clean EASYPOST_API_KEY')
    return key.trim()
  }
  
  // Try keys with newlines
  const variations = ['EASYPOST_API_KEY\n', 'EASYPOST_API_KEY\n\n', 'EASYPOST_API_KEY\r\n']
  for (const variant of variations) {
    key = Deno.env.get(variant)
    if (key) {
      console.log(`✅ Found EASYPOST_API_KEY with whitespace: "${variant}"`)
      return key.trim()
    }
  }
  
  console.log('❌ No EASYPOST_API_KEY found in any variation')
  return undefined
}

const easyPostApiKey = getCleanEasyPostKey()
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

console.log('=== ENVIRONMENT CHECK v6.0 ===')
console.log('EasyPost API Key:', easyPostApiKey ? `FOUND (${easyPostApiKey.length} chars, starts: ${easyPostApiKey.substring(0, 5)})` : 'NOT FOUND')
console.log('Supabase URL:', supabaseUrl ? 'Available' : 'Missing')
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Available' : 'Missing')

if (easyPostApiKey) {
  console.log('✅ API Key format check:', easyPostApiKey.startsWith('EZ') ? 'VALID' : 'INVALID')
} else {
  const allEnvVars = Deno.env.toObject()
  const easypostKeys = Object.keys(allEnvVars).filter(k => k.includes('EASYPOST'))
  console.log('Available EasyPost keys:', easypostKeys)
}

console.log('========================================')

serve(async (req) => {
  console.log('=== v6.0 REQUEST RECEIVED ===')
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    // Get clean API key for this request
    const currentKey = getCleanEasyPostKey()
    
    if (!currentKey) {
      console.error('❌ FATAL: No EasyPost API key available')
      return new Response(JSON.stringify({
        error: 'EasyPost API key not found',
        details: 'EASYPOST_API_KEY (including variations with newlines) not accessible',
        diagnostic: {
          version: '6.0',
          timestamp: new Date().toISOString(),
          keyVariationsChecked: ['EASYPOST_API_KEY', 'EASYPOST_API_KEY\\n', 'EASYPOST_API_KEY\\n\\n']
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    console.log('✅ Using API key:', currentKey.substring(0, 10) + '...')

    const { shipmentData } = await req.json()
    
    if (!shipmentData?.to_address || !shipmentData?.from_address || !shipmentData?.parcel) {
      return new Response(JSON.stringify({
        error: 'Invalid shipment data',
        details: 'Missing required fields'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    
    // Configure options
    if (!shipmentData.options) shipmentData.options = {}
    shipmentData.options.currency = 'USD'
    shipmentData.options.delivery_confirmation = 'NO_SIGNATURE'
    
    console.log('🚀 Calling EasyPost API...')
    
    const response = await fetch('https://api.easypost.com/v2/shipments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shipment: shipmentData }),
    })
    
    console.log('📡 EasyPost response:', response.status)
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ EasyPost error:', errorData)
      
      return new Response(JSON.stringify({
        error: response.status === 401 ? 'Invalid EasyPost API key' : 'EasyPost API error',
        details: errorData,
        diagnostic: { status: response.status, version: '6.0' }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      })
    }
    
    const shipmentResponse = await response.json()
    console.log('✅ SUCCESS - Rates:', shipmentResponse.rates?.length || 0)
    
    if (!shipmentResponse.rates?.length) {
      return new Response(JSON.stringify({
        error: 'No shipping rates available'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    
    // Save to database
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      try {
        const supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
          global: { headers: { Authorization: authHeader } }
        })
        
        const { data: authData } = await supabaseClient.auth.getUser()
        if (authData?.user) {
          const { data: userData } = await supabaseClient
            .from('users')
            .select('company_id')
            .eq('id', authData.user.id)
            .maybeSingle()
          
          await supabaseClient.from('shipments').insert({
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
          })
          
          console.log('💾 Saved to database')
        }
      } catch (dbError) {
        console.error('⚠️ Database save failed:', dbError)
      }
    }
    
    return new Response(JSON.stringify(shipmentResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    
  } catch (err) {
    console.error('💥 Function error:', err)
    return new Response(JSON.stringify({ 
      error: 'Internal error', 
      details: err.message,
      version: '6.0'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
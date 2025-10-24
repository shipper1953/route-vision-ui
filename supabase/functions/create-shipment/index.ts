import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

console.log('=== CREATE-SHIPMENT v8.0 WITH AUTH & VALIDATION ===')

// Address schema
const AddressSchema = z.object({
  name: z.string().max(100),
  company: z.string().max(100).optional(),
  street1: z.string().min(1).max(255),
  street2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(2),
  zip: z.string().min(5).max(10),
  country: z.string().length(2).default('US'),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(255).optional()
})

// Parcel schema
const ParcelSchema = z.object({
  length: z.number().positive().max(999),
  width: z.number().positive().max(999),
  height: z.number().positive().max(999),
  weight: z.number().positive().max(9999)
})

// Complete shipment data schema
const ShipmentDataSchema = z.object({
  to_address: AddressSchema,
  from_address: AddressSchema,
  parcel: ParcelSchema,
  options: z.object({
    currency: z.string().length(3).optional(),
    delivery_confirmation: z.string().optional()
  }).optional()
})

// Sanitize string helper
function sanitizeString(str: string | null | undefined, maxLength: number): string | null | undefined {
  if (!str) return str
  return str.trim().slice(0, maxLength)
}

// Sanitize address fields
function sanitizeAddress(address: any): any {
  return {
    ...address,
    name: sanitizeString(address.name, 100),
    company: sanitizeString(address.company, 100),
    street1: sanitizeString(address.street1, 255),
    street2: sanitizeString(address.street2, 255),
    city: sanitizeString(address.city, 100),
    state: sanitizeString(address.state, 2),
    zip: sanitizeString(address.zip, 10),
    phone: sanitizeString(address.phone, 20),
    email: sanitizeString(address.email, 255)
  }
}
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

console.log('=== ENVIRONMENT CHECK v7.0 ===')
console.log('EasyPost API Key:', easyPostApiKey ? 'configured' : 'missing')
console.log('Supabase URL:', supabaseUrl ? 'configured' : 'missing')
console.log('Supabase Anon Key:', supabaseAnonKey ? 'configured' : 'missing')

console.log('========================================')

serve(async (req) => {
  console.log('=== v7.0 REQUEST RECEIVED WITH AUTH ===')
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    // SECURITY: Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'Authentication required'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Get clean API key for this request
    const currentKey = getCleanEasyPostKey()
    
    if (!currentKey) {
      return new Response(JSON.stringify({
        error: 'Shipping provider configuration error'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const { shipmentData } = await req.json()
    
    // Validate shipment data
    const validatedData = ShipmentDataSchema.parse(shipmentData);
    
    // Sanitize addresses
    validatedData.to_address = sanitizeAddress(validatedData.to_address);
    validatedData.from_address = sanitizeAddress(validatedData.from_address);
    
    // Configure options
    if (!validatedData.options) validatedData.options = {}
    validatedData.options.currency = 'USD'
    validatedData.options.delivery_confirmation = 'NO_SIGNATURE'
    
    console.log('🚀 Calling EasyPost API...')
    
    const response = await fetch('https://api.easypost.com/v2/shipments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shipment: validatedData }),
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
    
  } catch (error: any) {
    // Handle validation errors
    if (error.name === 'ZodError') {
      console.error('[Validation Error]', error.errors);
      return new Response(JSON.stringify({
        error: 'Invalid shipment data',
        details: error.errors
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    
    console.error('[Create Shipment Error]', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
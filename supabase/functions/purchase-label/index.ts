
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// Get EasyPost API key from environment variables - check both naming conventions
const easyPostApiKey = Deno.env.get('EASYPOST_API_KEY') || Deno.env.get('VITE_EASYPOST_API_KEY')

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*', // In production, set this to your specific domain
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
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
      headers: corsHeaders,
      status: 401,
    })
  }

  try {
    const { shipmentId, rateId } = await req.json()
    
    if (!shipmentId || !rateId) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters',
      }), {
        headers: corsHeaders,
        status: 400,
      })
    }
    
    console.log(`Purchasing label for shipment ${shipmentId} with rate ${rateId}`)
    
    if (!easyPostApiKey) {
      return new Response(JSON.stringify({
        error: 'EasyPost API key is not available. Please configure it in Supabase Secrets with name EASYPOST_API_KEY or VITE_EASYPOST_API_KEY.'
      }), {
        headers: corsHeaders,
        status: 500,
      })
    }
    
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
        headers: corsHeaders,
        status: response.status,
      })
    }
    
    const purchaseResponse = await response.json()
    
    // Update shipment status in database
    const { error: updateError } = await supabaseClient
      .from('shipments')
      .update({
        status: 'purchased',
        label_url: purchaseResponse.postage_label?.label_url,
        tracking_code: purchaseResponse.tracking_code,
        selected_rate: rateId
      })
      .eq('easypost_id', shipmentId)
      .eq('user_id', data.user.id)
    
    if (updateError) {
      console.error('Error updating shipment in database:', updateError)
    }
    
    return new Response(JSON.stringify(purchaseResponse), { headers: corsHeaders })
    
  } catch (err) {
    console.error('Error processing request:', err)
    return new Response(JSON.stringify({ error: 'Internal server error', details: err.message }), {
      headers: corsHeaders,
      status: 500,
    })
  }
})


import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const easyPostApiKey = Deno.env.get('EASYPOST_API_KEY')

serve(async (req) => {
  // Set up CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // In production, set this to your actual domain
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  }

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers, status: 204 })
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
      headers,
      status: 401,
    })
  }

  try {
    const { shipmentId, rateId } = await req.json()
    
    if (!shipmentId || !rateId) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters',
      }), {
        headers,
        status: 400,
      })
    }
    
    console.log(`Purchasing label for shipment ${shipmentId} with rate ${rateId}`)
    
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
        headers,
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
    
    return new Response(JSON.stringify(purchaseResponse), { headers })
    
  } catch (err) {
    console.error('Error processing request:', err)
    return new Response(JSON.stringify({ error: 'Internal server error', details: err.message }), {
      headers,
      status: 500,
    })
  }
})

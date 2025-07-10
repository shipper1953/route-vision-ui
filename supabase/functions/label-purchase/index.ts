import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

console.log('=== LABEL-PURCHASE v1.0 FRESH START ===')

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== LABEL-PURCHASE v1.0 FUNCTION START ===')
  console.log('Request method:', req.method)
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    console.log('Processing label purchase request...')
    
    const apiKey = Deno.env.get('EASYPOST_API_KEY')
    if (!apiKey) {
      console.error('❌ EASYPOST_API_KEY not found')
      return new Response(JSON.stringify({ 
        error: 'EasyPost API key not configured' 
      }), {
        headers: corsHeaders,
        status: 500,
      })
    }
    console.log('✅ EasyPost API key found')
    
    const requestBody = await req.json()
    console.log('📥 Request body:', JSON.stringify(requestBody, null, 2))
    
    const { shipmentId, rateId, orderId } = requestBody
    
    if (!shipmentId || !rateId) {
      console.error('❌ Missing parameters')
      return new Response(JSON.stringify({ 
        error: 'Missing shipmentId or rateId' 
      }), {
        headers: corsHeaders,
        status: 400,
      })
    }
    
    console.log(`📦 Purchasing label for shipment ${shipmentId} with rate ${rateId}`)

    const response = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}/buy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        rate: { id: rateId }
      }),
    })
    
    const responseText = await response.text()
    let responseData
    
    try {
      responseData = JSON.parse(responseText)
    } catch (err) {
      responseData = { raw_response: responseText }
    }
    
    if (!response.ok) {
      console.error('❌ EasyPost API error:', responseData)
      return new Response(JSON.stringify({ 
        error: 'EasyPost API error',
        details: responseData 
      }), {
        headers: corsHeaders,
        status: response.status,
      })
    }
    
    console.log('✅ Label purchased successfully:', responseData.id)
    return new Response(JSON.stringify(responseData), {
      headers: corsHeaders,
      status: 200,
    })
    
  } catch (err) {
    console.error('💥 Error in label-purchase function:', err)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: err.message 
    }), {
      headers: corsHeaders,
      status: 500,
    })
  }
})
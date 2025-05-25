
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const easyPostApiKey = Deno.env.get('EASYPOST_API_KEY') || 
                      Deno.env.get('VITE_EASYPOST_API_KEY')

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    const { shipmentId, accuracy = 'percentile_75' } = await req.json()
    
    if (!shipmentId) {
      return new Response(JSON.stringify({
        error: 'Missing shipment ID',
      }), {
        headers: corsHeaders,
        status: 400,
      })
    }
    
    if (!easyPostApiKey) {
      return new Response(JSON.stringify({
        error: 'EasyPost API key not available'
      }), {
        headers: corsHeaders,
        status: 500,
      })
    }
    
    console.log(`Getting SmartRates for shipment ${shipmentId} with accuracy ${accuracy}`)
    
    const response = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}/smartrate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${easyPostApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        smartrate_accuracy: accuracy
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('SmartRate API error:', errorData)
      return new Response(JSON.stringify({
        error: 'SmartRate API error',
        details: errorData
      }), {
        headers: corsHeaders,
        status: response.status,
      })
    }
    
    const smartRateData = await response.json()
    console.log('SmartRates retrieved:', smartRateData.smartrates ? smartRateData.smartrates.length : 0)
    
    return new Response(JSON.stringify({
      smartRates: smartRateData.smartrates,
      count: smartRateData.smartrates ? smartRateData.smartrates.length : 0
    }), { headers: corsHeaders })
    
  } catch (err) {
    console.error('Error getting SmartRates:', err)
    return new Response(JSON.stringify({ error: 'Internal server error', details: err.message }), {
      headers: corsHeaders,
      status: 500,
    })
  }
})

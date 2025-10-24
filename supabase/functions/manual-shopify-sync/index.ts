import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const { shipmentId } = await req.json()

    console.log('🔄 Manual Shopify sync requested for shipment:', shipmentId)

    // Get shipment details
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('id, status, tracking_number, tracking_url, carrier, service')
      .eq('id', shipmentId)
      .single()

    if (shipmentError || !shipment) {
      throw new Error(`Shipment not found: ${shipmentError?.message}`)
    }

    // Get linked order
    const { data: orderShipment, error: orderError } = await supabase
      .from('order_shipments')
      .select('order_id')
      .eq('shipment_id', shipmentId)
      .single()

    if (orderError || !orderShipment) {
      throw new Error(`Order link not found: ${orderError?.message}`)
    }

    console.log('📦 Found order:', orderShipment.order_id)

    // Call shopify-update-fulfillment
    const { data: result, error: syncError } = await supabase.functions.invoke(
      'shopify-update-fulfillment',
      {
        body: {
          shipmentId: shipment.id,
          status: shipment.status,
          trackingNumber: shipment.tracking_number,
          trackingUrl: shipment.tracking_url,
          carrier: shipment.carrier,
          service: shipment.service
        }
      }
    )

    if (syncError) {
      throw new Error(`Sync failed: ${syncError.message}`)
    }

    console.log('✅ Sync completed:', result)

    return new Response(
      JSON.stringify({ 
        success: true, 
        shipmentId,
        orderId: orderShipment.order_id,
        result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

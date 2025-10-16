import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { shipmentId, status, trackingNumber, trackingUrl, carrier } = await req.json();

    console.log('Updating Shopify fulfillment:', { shipmentId, status });

    // Find order linked to this shipment
    const { data: orderShipment } = await supabase
      .from('order_shipments')
      .select('order_id')
      .eq('shipment_id', shipmentId)
      .single();

    if (!orderShipment) {
      console.log('No order linked to shipment');
      return new Response(JSON.stringify({ message: 'No order linked' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Get Shopify mapping
    const { data: mapping } = await supabase
      .from('shopify_order_mappings')
      .select('*, companies(settings)')
      .eq('ship_tornado_order_id', orderShipment.order_id)
      .single();

    if (!mapping) {
      console.log('No Shopify mapping found for order');
      return new Response(JSON.stringify({ message: 'No Shopify mapping' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const shopifySettings = mapping.companies?.settings?.shopify;

    if (!shopifySettings || !shopifySettings.connected) {
      console.log('Shopify not connected');
      return new Response(JSON.stringify({ message: 'Shopify not connected' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Get order details from Shopify
    const orderResponse = await fetch(
      `https://${shopifySettings.store_url}/admin/api/2024-01/orders/${mapping.shopify_order_id}.json`,
      {
        headers: {
          'X-Shopify-Access-Token': shopifySettings.access_token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!orderResponse.ok) {
      throw new Error('Failed to fetch Shopify order');
    }

    const { order } = await orderResponse.json();

    // Create or update fulfillment
    const fulfillmentData = {
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      tracking_company: carrier,
      notify_customer: true,
    };

    let fulfillmentResponse;

    if (order.fulfillments && order.fulfillments.length > 0) {
      // Update existing fulfillment
      const fulfillmentId = order.fulfillments[0].id;
      fulfillmentResponse = await fetch(
        `https://${shopifySettings.store_url}/admin/api/2024-01/fulfillments/${fulfillmentId}.json`,
        {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': shopifySettings.access_token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fulfillment: fulfillmentData }),
        }
      );
    } else {
      // Create new fulfillment
      fulfillmentResponse = await fetch(
        `https://${shopifySettings.store_url}/admin/api/2024-01/orders/${mapping.shopify_order_id}/fulfillments.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': shopifySettings.access_token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fulfillment: {
              ...fulfillmentData,
              line_items: order.line_items.map((item: any) => ({ id: item.id })),
            },
          }),
        }
      );
    }

    if (!fulfillmentResponse.ok) {
      const errorText = await fulfillmentResponse.text();
      console.error('Shopify fulfillment error:', errorText);
      throw new Error('Failed to update Shopify fulfillment');
    }

    console.log('Successfully updated Shopify fulfillment');

    // Update mapping
    await supabase
      .from('shopify_order_mappings')
      .update({ 
        last_synced_at: new Date().toISOString(),
        sync_status: 'synced',
      })
      .eq('id', mapping.id);

    // Log sync event
    await supabase
      .from('shopify_sync_logs')
      .insert({
        company_id: mapping.company_id,
        sync_type: 'fulfillment_update',
        direction: 'outbound',
        status: 'success',
        shopify_order_id: mapping.shopify_order_id,
        ship_tornado_order_id: mapping.ship_tornado_order_id,
        metadata: { tracking_number: trackingNumber, carrier },
      });

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Fulfillment update error:', error);
    
    // Log error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { shipmentId } = await req.json();
      const { data: orderShipment } = await supabase
        .from('order_shipments')
        .select('order_id, orders(company_id)')
        .eq('shipment_id', shipmentId)
        .single();

      if (orderShipment) {
        await supabase
          .from('shopify_sync_logs')
          .insert({
            company_id: orderShipment.orders.company_id,
            sync_type: 'fulfillment_update',
            direction: 'outbound',
            status: 'failed',
            error_message: error.message,
          });
      }
    } catch (logError) {
      console.error('Error logging failure:', logError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

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

    // Find order linked to this shipment with package info
    const { data: orderShipment, error: osError } = await supabase
      .from('order_shipments')
      .select('order_id, package_info')
      .eq('shipment_id', shipmentId)
      .maybeSingle();

    if (osError) {
      console.error('Error querying order_shipments:', osError);
      throw new Error(`Failed to query order_shipments: ${osError.message}`);
    }

    if (!orderShipment) {
      console.log('No order linked to shipment');
      return new Response(JSON.stringify({ message: 'No order linked' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log('Found order_shipment:', orderShipment);

    // Get order details separately
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('items, company_id')
      .eq('id', orderShipment.order_id)
      .single();

    if (orderError) {
      console.error('Error querying order:', orderError);
      throw new Error(`Failed to query order: ${orderError.message}`);
    }

    console.log('Found order with items:', { orderId: orderShipment.order_id, itemCount: order.items?.length });

    // Get Shopify mapping
    const { data: mapping, error: mappingError } = await supabase
      .from('shopify_order_mappings')
      .select('*')
      .eq('ship_tornado_order_id', orderShipment.order_id)
      .maybeSingle();

    if (mappingError) {
      console.error('Error querying shopify mapping:', mappingError);
      throw new Error(`Failed to query shopify mapping: ${mappingError.message}`);
    }

    if (!mapping) {
      console.log('No Shopify mapping found for order');
      return new Response(JSON.stringify({ message: 'No Shopify mapping' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log('Found Shopify mapping:', { shopifyOrderId: mapping.shopify_order_id });

    // Get company settings separately
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', order.company_id)
      .single();

    if (companyError) {
      console.error('Error querying company:', companyError);
      throw new Error(`Failed to query company: ${companyError.message}`);
    }

    const shopifySettings = company?.settings?.shopify;

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

    const { order: shopifyOrder } = await orderResponse.json();

    console.log('Fetched Shopify order:', { orderId: shopifyOrder.id, lineItemCount: shopifyOrder.line_items?.length });

    // Extract shipped items from package_info for partial fulfillment
    let lineItemsToFulfill: any[] = [];
    
    if (orderShipment.package_info?.items && Array.isArray(orderShipment.package_info.items)) {
      // We have item-level tracking - only fulfill the items in this shipment
      const shippedItems = orderShipment.package_info.items;
      console.log('Shipped items in this package:', shippedItems);
      
      // Match shipped items to Shopify line items by SKU
      lineItemsToFulfill = shopifyOrder.line_items.filter((lineItem: any) => {
        const shippedItem = shippedItems.find((si: any) => 
          si.sku === lineItem.sku || si.name === lineItem.name
        );
        return shippedItem !== undefined;
      }).map((lineItem: any) => {
        const shippedItem = shippedItems.find((si: any) => 
          si.sku === lineItem.sku || si.name === lineItem.name
        );
        return {
          id: lineItem.id,
          quantity: shippedItem.quantity // Fulfill only the quantity shipped
        };
      });
      
      console.log(`Fulfilling ${lineItemsToFulfill.length} line items (partial fulfillment)`);
    } else {
      // No item tracking - fulfill all items (legacy behavior)
      lineItemsToFulfill = shopifyOrder.line_items.map((item: any) => ({ id: item.id }));
      console.log('No item tracking - fulfilling all line items');
    }

    // Create or update fulfillment
    const fulfillmentData = {
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      tracking_company: carrier,
      notify_customer: true,
    };

    let fulfillmentResponse;

    if (shopifyOrder.fulfillments && shopifyOrder.fulfillments.length > 0) {
      // Update existing fulfillment
      const fulfillmentId = shopifyOrder.fulfillments[0].id;
      console.log('Updating existing fulfillment:', fulfillmentId);
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
      // Create new fulfillment with specific line items
      console.log('Creating new fulfillment with line items:', lineItemsToFulfill);
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
              line_items: lineItemsToFulfill,
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
        .select('order_id')
        .eq('shipment_id', shipmentId)
        .maybeSingle();

      if (orderShipment) {
        const { data: order } = await supabase
          .from('orders')
          .select('company_id')
          .eq('id', orderShipment.order_id)
          .single();

        if (order) {
          await supabase
            .from('shopify_sync_logs')
            .insert({
              company_id: order.company_id,
              sync_type: 'fulfillment_update',
              direction: 'outbound',
              status: 'failed',
              error_message: error.message,
            });
        }
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

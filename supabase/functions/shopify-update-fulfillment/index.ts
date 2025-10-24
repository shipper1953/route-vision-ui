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

  // Parse request body once and store it
  const requestBody = await req.json();
  const { shipmentId, status, trackingNumber, trackingUrl, carrier } = requestBody;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Updating Shopify fulfillment:', { shipmentId, status });

    // Find order linked to this shipment with package info
    const { data: orderShipment, error: osError } = await supabase
      .from('order_shipments')
      .select('order_id, package_info, package_index')
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

    // Enrich order items with Shopify IDs from items table
    const itemIds = order.items?.map((item: any) => item.itemId).filter(Boolean) || [];
    let enrichedOrderItems = order.items || [];
    
    if (itemIds.length > 0) {
      const { data: itemDetails } = await supabase
        .from('items')
        .select('id, sku, name, shopify_product_id, shopify_variant_id, shopify_product_gid, shopify_variant_gid')
        .in('id', itemIds);

      if (itemDetails && itemDetails.length > 0) {
        const itemDetailsMap = new Map(itemDetails.map(item => [item.id, item]));
        
        enrichedOrderItems = order.items.map((item: any) => {
          const details = itemDetailsMap.get(item.itemId);
          return {
            ...item,
            shopify_product_id: details?.shopify_product_id,
            shopify_variant_id: details?.shopify_variant_id,
            shopify_product_gid: details?.shopify_product_gid,
            shopify_variant_gid: details?.shopify_variant_gid
          };
        });
        
        console.log('Enriched order items with Shopify IDs:', enrichedOrderItems.map((item: any) => ({
          sku: item.sku,
          shopify_variant_id: item.shopify_variant_id,
          shopify_product_id: item.shopify_product_id
        })));
      }
    }

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
      console.log('No Shopify mapping found for order - skipping');
      
      // Log as skipped
      await supabase
        .from('shopify_sync_logs')
        .insert({
          company_id: order.company_id,
          sync_type: 'fulfillment_update',
          direction: 'outbound',
          status: 'skipped',
          ship_tornado_order_id: orderShipment.order_id,
          error_message: 'Order not imported from Shopify',
        });
      
      return new Response(JSON.stringify({ message: 'No Shopify mapping', skipped: true }), {
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

    // Fetch fulfillment orders (required for 2024-01 API)
    const fulfillmentOrdersResponse = await fetch(
      `https://${shopifySettings.store_url}/admin/api/2024-01/orders/${mapping.shopify_order_id}/fulfillment_orders.json`,
      {
        headers: {
          'X-Shopify-Access-Token': shopifySettings.access_token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!fulfillmentOrdersResponse.ok) {
      const errorText = await fulfillmentOrdersResponse.text();
      console.error('Failed to fetch fulfillment orders:', errorText);
      throw new Error(`Failed to fetch fulfillment orders: ${errorText}`);
    }

    const { fulfillment_orders } = await fulfillmentOrdersResponse.json();

    if (!fulfillment_orders || fulfillment_orders.length === 0) {
      const fulfillmentStatus = shopifyOrder.fulfillment_status;
      const financialStatus = shopifyOrder.financial_status;
      
      console.warn('⚠️ No fulfillment orders found:', {
        shopifyOrderId: mapping.shopify_order_id,
        fulfillmentStatus,
        financialStatus,
        orderStatus: shopifyOrder.status
      });
      
      // Log detailed diagnostic
      await supabase.from('shopify_sync_logs').insert({
        company_id: order.company_id,
        sync_type: 'fulfillment',
        direction: 'outbound',
        status: 'skipped',
        shopify_order_id: mapping.shopify_order_id,
        ship_tornado_order_id: orderShipment.order_id,
        error_message: `No fulfillment orders found. Order status: ${fulfillmentStatus}, Financial: ${financialStatus}`,
        metadata: { 
          fulfillmentStatus, 
          financialStatus, 
          orderStatus: shopifyOrder.status,
          reason: fulfillmentStatus === 'fulfilled' ? 'already_fulfilled' : 
                  shopifyOrder.status === 'draft' ? 'draft_order' : 'unknown'
        }
      });
      
      return new Response(
        JSON.stringify({ 
          message: 'Shopify order not fulfillable',
          reason: fulfillmentStatus === 'fulfilled' ? 'Order already fulfilled in Shopify' :
                  shopifyOrder.status === 'draft' ? 'Draft order cannot be fulfilled' :
                  'Order does not require shipping or has no fulfillment location configured',
          orderStatus: { fulfillmentStatus, financialStatus, status: shopifyOrder.status }
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const fulfillmentOrder = fulfillment_orders[0];
    const fulfillmentOrderId = fulfillmentOrder.id;
    const fulfillmentOrderLineItems = fulfillmentOrder.line_items || [];

    console.log('Fulfillment order details:', {
      id: fulfillmentOrderId,
      status: fulfillmentOrder.status,
      lineItemCount: fulfillmentOrderLineItems.length
    });

    console.log('Fulfillment order line items:', fulfillmentOrderLineItems.map((li: any) => ({
      fulfillment_order_line_item_id: li.id,
      line_item_id: li.line_item_id,
      sku: li.sku,
      quantity: li.quantity,
      fulfillable_quantity: li.fulfillable_quantity
    })));

    // Extract shipped items from package_info for this specific package
    let lineItemsToFulfill: any[] = [];

    if (orderShipment.package_info?.items && Array.isArray(orderShipment.package_info.items)) {
      // We have item-level tracking - only fulfill items in THIS specific package
      const shippedItems = orderShipment.package_info.items;
      
      // Enrich shipped items with Shopify IDs and GIDs
      const enrichedShippedItems = shippedItems.map((si: any) => {
        const enrichedItem = enrichedOrderItems.find((oi: any) => 
          oi.sku === si.sku || oi.name === si.name
        );
        return {
          ...si,
          shopify_variant_id: enrichedItem?.shopify_variant_id,
          shopify_product_id: enrichedItem?.shopify_product_id,
          shopify_variant_gid: enrichedItem?.shopify_variant_gid,
          shopify_product_gid: enrichedItem?.shopify_product_gid
        };
      });
      
      console.log('Items in this package with Shopify IDs:', enrichedShippedItems.map((si: any) => ({
        sku: si.sku,
        name: si.name,
        quantity: si.quantity,
        shopify_variant_id: si.shopify_variant_id,
        shopify_product_id: si.shopify_product_id
      })));
      
      // Match shipped items to fulfillment order line items using Shopify variant IDs
      lineItemsToFulfill = fulfillmentOrderLineItems
        .filter((foLineItem: any) => {
          // Check if this line item has any quantity left to fulfill
          if (foLineItem.fulfillable_quantity === 0) {
            console.log(`Skipping line item ${foLineItem.line_item_id} - already fully fulfilled`);
            return false;
          }
          
          // Find the corresponding Shopify order line item
          const shopifyLineItem = shopifyOrder.line_items.find((li: any) => li.id === foLineItem.line_item_id);
          
          if (!shopifyLineItem) {
            console.log(`⚠️ Could not find Shopify line item for fulfillment order line item ${foLineItem.line_item_id}`);
            return false;
          }
          
          // Match by Shopify variant_id (most reliable) or product_id, with SKU fallback
          const shippedItem = enrichedShippedItems.find((si: any) => 
            (si.shopify_variant_id && shopifyLineItem.variant_id && 
             si.shopify_variant_id.toString() === shopifyLineItem.variant_id.toString()) ||
            (si.shopify_product_id && shopifyLineItem.product_id && 
             si.shopify_product_id.toString() === shopifyLineItem.product_id.toString()) ||
            (si.sku && shopifyLineItem.sku && si.sku === shopifyLineItem.sku)
          );
          
          if (shippedItem) {
            console.log(`✅ Matched item by Shopify variant_id: ${shopifyLineItem.variant_id} (${shopifyLineItem.name})`);
          }
          
          return shippedItem !== undefined;
        })
        .map((foLineItem: any) => {
          const shopifyLineItem = shopifyOrder.line_items.find((li: any) => li.id === foLineItem.line_item_id);
          
          const shippedItem = enrichedShippedItems.find((si: any) => 
            (si.shopify_variant_id && shopifyLineItem?.variant_id && 
             si.shopify_variant_id.toString() === shopifyLineItem.variant_id.toString()) ||
            (si.shopify_product_id && shopifyLineItem?.product_id && 
             si.shopify_product_id.toString() === shopifyLineItem.product_id.toString()) ||
            (si.sku && shopifyLineItem?.sku && si.sku === shopifyLineItem.sku)
          );
          
          // Fulfill the lesser of: shipped quantity OR remaining fulfillable quantity
          const quantityToFulfill = shippedItem ? Math.min(
            shippedItem.quantity, 
            foLineItem.fulfillable_quantity
          ) : foLineItem.fulfillable_quantity;
          
          return {
            fulfillment_order_line_item_id: foLineItem.id,
            quantity: quantityToFulfill
          };
        })
        .filter((item: any) => item.quantity > 0); // Only include items with quantity
      
      console.log(`Fulfilling ${lineItemsToFulfill.length} line items for this package:`, 
        lineItemsToFulfill.map((li: any) => ({ 
          fulfillment_order_line_item_id: li.id, 
          quantity: li.quantity 
        }))
      );
      
      // Validation: Ensure we have items to fulfill
      if (lineItemsToFulfill.length === 0) {
        console.warn('⚠️ No items matched for fulfillment - all may already be fulfilled');
        
        await supabase.from('shopify_sync_logs').insert({
          company_id: order.company_id,
          sync_type: 'fulfillment',
          direction: 'outbound',
          status: 'skipped',
          shopify_order_id: mapping.shopify_order_id,
          ship_tornado_order_id: orderShipment.order_id,
          error_message: 'All items already fulfilled in Shopify or no matching items found',
          metadata: { 
            shippedItems: shippedItems.map((si: any) => ({ sku: si.sku, name: si.name })),
            availableLineItems: fulfillmentOrderLineItems.map((li: any) => ({ 
              sku: li.sku, 
              fulfillable_quantity: li.fulfillable_quantity 
            }))
          }
        });
        
        return new Response(
          JSON.stringify({ 
            message: 'No items to fulfill',
            reason: 'Items may already be fulfilled or SKUs do not match'
          }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    } else {
      // No item tracking - fulfill all remaining items (legacy behavior)
      // This should rarely happen with modern multi-package orders
      lineItemsToFulfill = fulfillmentOrderLineItems
        .filter((foLineItem: any) => foLineItem.fulfillable_quantity > 0)
        .map((foLineItem: any) => ({ 
          fulfillment_order_line_item_id: foLineItem.id,
          quantity: foLineItem.fulfillable_quantity
        }));
      console.log('No item tracking - fulfilling all remaining line items');
    }

    // Always create a NEW fulfillment for each package/shipment
    // This enables multi-package fulfillment and partial fulfillment over time
    console.log('Creating new fulfillment for this package with tracking:', trackingNumber);

    console.log('📤 Sending fulfillment request to Shopify:', {
      fulfillment_order_id: fulfillmentOrderId,
      line_items_count: lineItemsToFulfill.length,
      line_items: lineItemsToFulfill,
      tracking_number: trackingNumber
    });

    const fulfillmentResponse = await fetch(
      `https://${shopifySettings.store_url}/admin/api/2024-01/fulfillment_orders/${fulfillmentOrderId}/fulfillments.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': shopifySettings.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fulfillment: {
            notify_customer: true,
            tracking_info: {
              number: trackingNumber,
              url: trackingUrl,
              company: carrier
            },
            line_items_by_fulfillment_order: [{
              fulfillment_order_id: fulfillmentOrderId,
              fulfillment_request_order_line_items: lineItemsToFulfill
            }]
          },
        }),
      }
    );

    if (!fulfillmentResponse.ok) {
      const errorStatus = fulfillmentResponse.status;
      const errorText = await fulfillmentResponse.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        errorJson = { raw: errorText };
      }
      
      console.error('❌ Shopify fulfillment creation failed:', { 
        status: errorStatus, 
        error: errorJson,
        trackingNumber,
        itemCount: lineItemsToFulfill.length
      });
      
      // Log the failure
      await supabase.from('shopify_sync_logs').insert({
        company_id: order.company_id,
        sync_type: 'fulfillment',
        direction: 'outbound',
        status: 'error',
        shopify_order_id: mapping.shopify_order_id,
        ship_tornado_order_id: orderShipment.order_id,
        error_message: `Shopify API error ${errorStatus}: ${JSON.stringify(errorJson)}`,
        metadata: { 
          trackingNumber,
          lineItemsToFulfill,
          responseStatus: errorStatus,
          responseBody: errorJson
        }
      });
      
      throw new Error(`Failed to create Shopify fulfillment (${errorStatus}): ${JSON.stringify(errorJson)}`);
    }

    const fulfillmentResult = await fulfillmentResponse.json();
    const fulfillmentId = fulfillmentResult.fulfillment?.id;
    
    // Log what Shopify actually created
    console.log('📥 Shopify fulfillment response:', {
      fulfillmentId,
      line_items_created: fulfillmentResult.fulfillment?.line_items?.length || 0,
      line_items_details: fulfillmentResult.fulfillment?.line_items?.map((li: any) => ({
        id: li.id,
        variant_id: li.variant_id,
        sku: li.sku,
        name: li.name,
        quantity: li.quantity
      })) || []
    });
    
    console.log('✅ Successfully created fulfillment:', {
      fulfillmentId,
      trackingNumber,
      itemsRequested: lineItemsToFulfill.length,
      itemsActuallyFulfilled: fulfillmentResult.fulfillment?.line_items?.length || 0
    });

    // Update mapping
    await supabase
      .from('shopify_order_mappings')
      .update({ 
        last_synced_at: new Date().toISOString(),
        sync_status: 'synced',
      })
      .eq('id', mapping.id);

    // Log success
    await supabase
      .from('shopify_sync_logs')
      .insert({
        company_id: order.company_id,
        sync_type: 'fulfillment',
        direction: 'outbound',
        status: 'success',
        shopify_order_id: mapping.shopify_order_id,
        ship_tornado_order_id: orderShipment.order_id,
        metadata: { 
          fulfillmentId,
          trackingNumber,
          packageIndex: orderShipment.package_index || 0,
          itemsFulfilled: lineItemsToFulfill.length,
          carrier,
          service: requestBody.service
        },
      });

    console.log('✅ Shopify fulfillment update completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        fulfillmentId,
        trackingNumber,
        itemsFulfilled: lineItemsToFulfill.length,
        message: 'Fulfillment created successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );

  } catch (error) {
    console.error('Fulfillment update error:', error);
    
    // Log error using stored request body
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: orderShipment } = await supabase
        .from('order_shipments')
        .select('order_id')
        .eq('shipment_id', requestBody.shipmentId)
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
              sync_type: 'fulfillment',
              direction: 'outbound',
              status: 'error',
              ship_tornado_order_id: orderShipment.order_id,
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

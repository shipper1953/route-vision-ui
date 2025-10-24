import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// GraphQL helper for Shopify API calls
async function shopifyGraphQL(
  shopifySettings: any,
  query: string,
  variables: any = {}
) {
  const apiVersion = '2024-10';
  const response = await fetch(
    `https://${shopifySettings.store_url}/admin/api/${apiVersion}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': shopifySettings.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  if (!response.ok) {
    throw new Error(`GraphQL HTTP error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    console.error('❌ GraphQL errors:', result.errors);
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }
  
  return result.data;
}

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

    // Fetch order and fulfillment orders via GraphQL
    const fulfillmentOrdersQuery = `
      query getFulfillmentOrders($orderId: ID!) {
        order(id: $orderId) {
          id
          name
          displayFulfillmentStatus
          displayFinancialStatus
          fulfillmentOrders(first: 10, query: "status:open OR status:in_progress") {
            edges {
              node {
                id
                status
                lineItems(first: 100) {
                  edges {
                    node {
                      id
                      lineItem {
                        id
                        sku
                        name
                        variant {
                          id
                        }
                      }
                      remainingQuantity
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    console.log('📋 Fetching fulfillment orders via GraphQL...');

    const fulfillmentOrdersData = await shopifyGraphQL(shopifySettings, fulfillmentOrdersQuery, {
      orderId: `gid://shopify/Order/${mapping.shopify_order_id}`
    });

    if (!fulfillmentOrdersData.order) {
      throw new Error('Order not found in Shopify');
    }

    const shopifyOrder = fulfillmentOrdersData.order;
    const fulfillment_orders = fulfillmentOrdersData.order.fulfillmentOrders.edges.map(e => e.node);

    console.log('Fetched Shopify order via GraphQL:', {
      orderId: shopifyOrder.id,
      orderName: shopifyOrder.name,
      fulfillmentOrdersCount: fulfillment_orders.length
    });

    if (!fulfillment_orders || fulfillment_orders.length === 0) {
      const fulfillmentStatus = shopifyOrder.displayFulfillmentStatus;
      const financialStatus = shopifyOrder.displayFinancialStatus;
      
      console.warn('⚠️ No fulfillment orders found:', {
        shopifyOrderId: mapping.shopify_order_id,
        fulfillmentStatus,
        financialStatus
      });
      
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
          reason: fulfillmentStatus === 'fulfilled' ? 'already_fulfilled' : 'unknown'
        }
      });
      
      return new Response(
        JSON.stringify({ 
          message: 'Shopify order not fulfillable',
          reason: fulfillmentStatus === 'fulfilled' ? 'Order already fulfilled in Shopify' : 'Order does not require shipping',
          orderStatus: { fulfillmentStatus, financialStatus }
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('Fulfillment orders found:', {
      count: fulfillment_orders.length,
      orderName: shopifyOrder.name,
      statuses: fulfillment_orders.map(fo => fo.status)
    });

    // Build line items array for fulfillment
    const lineItemsToFulfill: Array<{ 
      fulfillmentOrderLineItemId: string; 
      quantity: number 
    }> = [];

    // Group by fulfillment order
    const itemsByFulfillmentOrder = new Map<string, typeof lineItemsToFulfill>();

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
      
      console.log('Items in this package with Shopify GIDs:', enrichedShippedItems.map((si: any) => ({
        sku: si.sku,
        name: si.name,
        quantity: si.quantity,
        shopify_variant_gid: si.shopify_variant_gid,
        shopify_variant_id: si.shopify_variant_id
      })));
      
      for (const fulfillmentOrder of fulfillment_orders) {
        const fulfillmentOrderItems: typeof lineItemsToFulfill = [];
        
        for (const lineItemEdge of fulfillmentOrder.lineItems.edges) {
          const foLineItem = lineItemEdge.node;
          
          // Skip if nothing left to fulfill
          if (foLineItem.remainingQuantity === 0) {
            console.log(`⏭️ Skipping ${foLineItem.lineItem.sku} - already fully fulfilled`);
            continue;
          }
          
          // Match by GID first (most accurate), fallback to numeric ID
          const variantGid = foLineItem.lineItem.variant?.id;
          const variantId = variantGid?.split('/').pop();
          
          const shippedItem = enrichedShippedItems.find((si: any) => 
            (si.shopify_variant_gid && si.shopify_variant_gid === variantGid) ||
            (si.shopify_variant_id && si.shopify_variant_id === variantId) ||
            (si.sku && si.sku === foLineItem.lineItem.sku)
          );
          
          if (shippedItem) {
            const quantity = Math.min(shippedItem.quantity, foLineItem.remainingQuantity);
            
            fulfillmentOrderItems.push({
              fulfillmentOrderLineItemId: foLineItem.id,
              quantity
            });
            
            console.log(`✅ Matched item: ${foLineItem.lineItem.sku} (${foLineItem.lineItem.name}) - fulfilling ${quantity}/${foLineItem.remainingQuantity}`);
          } else {
            console.log(`⚠️ No match for Shopify item: ${foLineItem.lineItem.sku} (variant ${variantId})`);
          }
        }
        
        if (fulfillmentOrderItems.length > 0) {
          itemsByFulfillmentOrder.set(fulfillmentOrder.id, fulfillmentOrderItems);
        }
      }
      
      // Validate we have items to fulfill
      if (itemsByFulfillmentOrder.size === 0) {
        console.warn('⚠️ No items matched for fulfillment');
        
        await supabase.from('shopify_sync_logs').insert({
          company_id: order.company_id,
          sync_type: 'fulfillment',
          direction: 'outbound',
          status: 'skipped',
          shopify_order_id: mapping.shopify_order_id,
          ship_tornado_order_id: orderShipment.order_id,
          error_message: 'All items already fulfilled in Shopify or no matching items found',
          metadata: { 
            shippedItems: shippedItems.map((si: any) => ({ sku: si.sku, name: si.name }))
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
      for (const fulfillmentOrder of fulfillment_orders) {
        const fulfillmentOrderItems: typeof lineItemsToFulfill = [];
        
        for (const lineItemEdge of fulfillmentOrder.lineItems.edges) {
          const foLineItem = lineItemEdge.node;
          
          if (foLineItem.remainingQuantity > 0) {
            fulfillmentOrderItems.push({
              fulfillmentOrderLineItemId: foLineItem.id,
              quantity: foLineItem.remainingQuantity
            });
          }
        }
        
        if (fulfillmentOrderItems.length > 0) {
          itemsByFulfillmentOrder.set(fulfillmentOrder.id, fulfillmentOrderItems);
        }
      }
      
      console.log('No item tracking - fulfilling all remaining line items');
    }

    // Create fulfillment via GraphQL
    console.log('📤 Creating fulfillment via GraphQL:', {
      fulfillmentOrdersCount: itemsByFulfillmentOrder.size,
      totalItems: Array.from(itemsByFulfillmentOrder.values()).reduce((sum, items) => sum + items.length, 0),
      tracking_number: trackingNumber
    });

    const createFulfillmentMutation = `
      mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
        fulfillmentCreateV2(fulfillment: $fulfillment) {
          fulfillment {
            id
            status
            createdAt
            trackingInfo {
              number
              url
              company
            }
            fulfillmentLineItems(first: 100) {
              edges {
                node {
                  id
                  lineItem {
                    id
                    sku
                    name
                  }
                  quantity
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const fulfillmentInput = {
      lineItemsByFulfillmentOrder: Array.from(itemsByFulfillmentOrder.entries()).map(([foId, items]) => ({
        fulfillmentOrderId: foId,
        fulfillmentOrderLineItems: items
      })),
      notifyCustomer: shopifySettings?.fulfillment?.notify_customers ?? true,
      trackingInfo: {
        number: trackingNumber,
        url: trackingUrl || undefined,
        company: carrier || 'Unknown'
      }
    };

    console.log('📦 Fulfillment input structure:', JSON.stringify(fulfillmentInput, null, 2));

    const fulfillmentResult = await shopifyGraphQL(shopifySettings, createFulfillmentMutation, {
      fulfillment: fulfillmentInput
    });

    const userErrors = fulfillmentResult.fulfillmentCreateV2.userErrors;
    if (userErrors && userErrors.length > 0) {
      console.error('❌ Shopify validation errors:', userErrors);
      
      await supabase.from('shopify_sync_logs').insert({
        company_id: order.company_id,
        sync_type: 'fulfillment',
        direction: 'outbound',
        status: 'error',
        shopify_order_id: mapping.shopify_order_id,
        ship_tornado_order_id: orderShipment.order_id,
        error_message: `Fulfillment validation failed: ${userErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`,
        metadata: { trackingNumber, userErrors }
      });
      
      throw new Error(`Fulfillment validation failed: ${userErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`);
    }

    const fulfillment = fulfillmentResult.fulfillmentCreateV2.fulfillment;
    if (!fulfillment) {
      throw new Error('Fulfillment creation returned no fulfillment object');
    }

    const fulfillmentId = fulfillment.id.split('/').pop();

    console.log('📥 Shopify fulfillment created:', {
      fulfillmentId,
      status: fulfillment.status,
      createdAt: fulfillment.createdAt,
      line_items_count: fulfillment.fulfillmentLineItems.edges.length,
      line_items: fulfillment.fulfillmentLineItems.edges.map(e => ({
        sku: e.node.lineItem.sku,
        name: e.node.lineItem.name,
        quantity: e.node.quantity
      }))
    });

    console.log('✅ Successfully created fulfillment:', {
      fulfillmentId,
      trackingNumber: fulfillment.trackingInfo?.number,
      itemsRequested: Array.from(itemsByFulfillmentOrder.values()).reduce((sum, items) => sum + items.length, 0),
      itemsActuallyFulfilled: fulfillment.fulfillmentLineItems.edges.length
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// GraphQL helper for Shopify API calls
async function shopifyGraphQL(
  storeUrl: string,
  accessToken: string,
  query: string,
  variables: any = {}
) {
  const apiVersion = '2025-01';
  const response = await fetch(
    `https://${storeUrl}/admin/api/${apiVersion}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
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

  const requestBody = await req.json();
  const { shipmentId, status, trackingNumber, trackingUrl, carrier, service } = requestBody;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Updating Shopify fulfillment:', { shipmentId, status });

    // Find order linked to this shipment
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

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('items, company_id, shopify_store_id')
      .eq('id', orderShipment.order_id)
      .single();

    if (orderError) {
      throw new Error(`Failed to query order: ${orderError.message}`);
    }

    // Get Shopify order mapping
    const { data: mapping, error: mappingError } = await supabase
      .from('shopify_order_mappings')
      .select('shopify_order_id, shopify_store_id')
      .eq('ship_tornado_order_id', orderShipment.order_id)
      .maybeSingle();

    if (mappingError) throw mappingError;

    if (!mapping) {
      console.log('No Shopify mapping found for order');
      return new Response(JSON.stringify({ message: 'Not a Shopify order' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Get Shopify store credentials from shopify_stores table
    const storeId = mapping.shopify_store_id || order.shopify_store_id;
    console.log('Looking up store with ID:', storeId, 'company_id:', order.company_id);
    
    let store: any = null;
    if (storeId) {
      const { data: storeData, error: storeError } = await supabase
        .from('shopify_stores')
        .select('store_url, access_token, fulfillment_service_location_id')
        .eq('id', storeId)
        .single();
      console.log('Store lookup result:', storeData ? `Found: ${storeData.store_url}` : 'Not found', 'Error:', storeError?.message);
      store = storeData;
    }
    
    // Fallback: find store by company_id
    if (!store?.access_token) {
      console.log('Store not found by ID, trying company_id fallback...', order.company_id);
      const { data: storeData, error: fallbackError } = await supabase
        .from('shopify_stores')
        .select('store_url, access_token, fulfillment_service_location_id')
        .eq('company_id', order.company_id)
        .not('access_token', 'is', null)
        .limit(1)
        .maybeSingle();
      console.log('Fallback result:', storeData ? `Found: ${storeData.store_url}` : 'Not found', 'Error:', fallbackError?.message);
      store = storeData;
    }

    if (!store?.access_token) {
      throw new Error('Shopify store not connected or access token missing');
    }

    console.log(`Using Shopify store: ${store.store_url}`);

    // Extract Shopify order ID (numeric)
    const shopifyOrderId = mapping.shopify_order_id.toString().replace('gid://shopify/Order/', '');

    console.log('Processing fulfillment for Shopify order:', shopifyOrderId);

    // Check if fulfillment service is registered
    const hasFulfillmentService = !!store.fulfillment_service_location_id;

    if (hasFulfillmentService) {
      console.log('✅ Using fulfillment service flow');
      return await handleFulfillmentServiceFlow(
        supabase,
        store,
        orderShipment,
        order,
        mapping,
        trackingNumber,
        trackingUrl,
        carrier,
        shopifyOrderId
      );
    } else {
      console.log('⚠️ Fulfillment service not registered - using legacy flow');
      return await handleLegacyFlow(
        supabase,
        store,
        orderShipment,
        order,
        mapping,
        trackingNumber,
        trackingUrl,
        carrier,
        shopifyOrderId
      );
    }

  } catch (error: any) {
    console.error('Error updating Shopify fulfillment:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Fetch fulfillment orders directly from Shopify GraphQL API
async function fetchFulfillmentOrdersFromShopify(
  storeUrl: string,
  accessToken: string,
  shopifyOrderId: string
) {
  console.log(`📡 Fetching fulfillment orders from Shopify for order ${shopifyOrderId}`);

  const query = `
    query getFulfillmentOrders($orderId: ID!) {
      order(id: $orderId) {
        fulfillmentOrders(first: 10) {
          nodes {
            id
            status
            assignedLocation {
              location {
                id
                name
              }
            }
            lineItems(first: 50) {
              nodes {
                id
                remainingQuantity
                totalQuantity
                inventoryItemId
                lineItem {
                  id
                  sku
                  name
                  variant {
                    id
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(storeUrl, accessToken, query, {
    orderId: `gid://shopify/Order/${shopifyOrderId}`
  });

  const fulfillmentOrders = data?.order?.fulfillmentOrders?.nodes || [];
  console.log(`Found ${fulfillmentOrders.length} fulfillment orders from Shopify API`);
  
  // Filter to open/in_progress ones
  const openOrders = fulfillmentOrders.filter((fo: any) => 
    ['OPEN', 'IN_PROGRESS', 'SCHEDULED'].includes(fo.status)
  );
  
  console.log(`Open fulfillment orders: ${openOrders.length} (statuses: ${fulfillmentOrders.map((fo: any) => fo.status).join(', ')})`);
  
  return openOrders;
}

// Fulfillment Service Flow - Uses fulfillment orders
async function handleFulfillmentServiceFlow(
  supabase: any,
  store: any,
  orderShipment: any,
  order: any,
  mapping: any,
  trackingNumber: string,
  trackingUrl: string,
  carrier: string,
  shopifyOrderId: string
) {
  console.log('Fetching fulfillment order for order:', orderShipment.order_id);

  // First try local table
  let fulfillmentOrderData: any = null;
  
  const { data: localFOs, error: foError } = await supabase
    .from('shopify_fulfillment_orders')
    .select('*')
    .eq('ship_tornado_order_id', orderShipment.order_id)
    .not('status', 'in', '("closed","cancelled")');
  
  if (foError) {
    console.error('Error fetching local fulfillment orders:', foError);
  }

  if (localFOs && localFOs.length > 0) {
    console.log(`Found ${localFOs.length} local fulfillment orders`);
    fulfillmentOrderData = localFOs[0];
  } else {
    // Fallback: fetch directly from Shopify GraphQL API
    console.log('No local fulfillment orders found - fetching from Shopify API...');
    
    const shopifyFOs = await fetchFulfillmentOrdersFromShopify(
      store.store_url,
      store.access_token,
      shopifyOrderId
    );

    if (shopifyFOs.length > 0) {
      const fo = shopifyFOs[0];
      // Transform Shopify GraphQL format to our expected format
      fulfillmentOrderData = {
        fulfillment_order_id: fo.id,
        status: fo.status.toLowerCase(),
        line_items: fo.lineItems.nodes.map((li: any) => ({
          id: li.id.replace('gid://shopify/FulfillmentOrderLineItem/', ''),
          fulfillment_order_line_item_gid: li.id,
          sku: li.lineItem?.sku || '',
          name: li.lineItem?.name || '',
          variant_id: li.lineItem?.variant?.id || '',
          quantity: li.totalQuantity,
          remainingQuantity: li.remainingQuantity,
          fulfillable_quantity: li.remainingQuantity
        }))
      };
      console.log('✅ Built fulfillment order from Shopify API:', fulfillmentOrderData.fulfillment_order_id);
    }
  }

  if (!fulfillmentOrderData) {
    console.warn('No fulfillment orders found from local DB or Shopify API');
    
    await supabase.from('shopify_sync_logs').insert({
      company_id: order.company_id,
      sync_type: 'fulfillment',
      direction: 'outbound',
      status: 'skipped',
      shopify_order_id: mapping.shopify_order_id,
      ship_tornado_order_id: orderShipment.order_id,
      error_message: 'No open fulfillment orders found',
      metadata: { reason: 'no_fulfillment_order' }
    });

    return new Response(
      JSON.stringify({ message: 'No fulfillment order assigned yet' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }

  console.log('Using fulfillment order:', fulfillmentOrderData.fulfillment_order_id);

  // Build line items for fulfillment
  const fulfillmentOrderLineItems: Array<{ id: string; quantity: number }> = [];
  const lineItems = fulfillmentOrderData.line_items || [];

  if (orderShipment.package_info?.items && Array.isArray(orderShipment.package_info.items)) {
    const shippedItems = orderShipment.package_info.items;
    
    console.log('Items in this shipment:', shippedItems.map((si: any) => ({
      sku: si.sku,
      name: si.name,
      quantity: si.quantity
    })));

    console.log('Fulfillment order line items:', JSON.stringify(lineItems, null, 2));
    
    // Filter to only line items that still have quantity to fulfill
    const availableLineItems = lineItems.filter((li: any) => 
      (li.remainingQuantity || li.fulfillable_quantity || li.quantity || 0) > 0
    );
    
    console.log(`Available line items with remaining quantity: ${availableLineItems.length} of ${lineItems.length}`);
    
    for (const foLineItem of availableLineItems) {
      // Try multiple matching strategies
      const shippedItem = shippedItems.find((si: any) => {
        // Strategy 1: Match by Shopify variant ID
        if (si.shopifyVariantId && foLineItem.variant_id) {
          const siVariantId = si.shopifyVariantId.toString().replace('gid://shopify/ProductVariant/', '');
          const foVariantId = foLineItem.variant_id.toString().replace('gid://shopify/ProductVariant/', '');
          if (siVariantId === foVariantId) {
            console.log(`✅ Matched by Shopify variant ID: ${siVariantId}`);
            return true;
          }
        }
        
        // Strategy 2: Match by SKU
        if (si.sku && foLineItem.sku) {
          if (si.sku === foLineItem.sku) {
            console.log(`✅ Matched by SKU: ${si.sku}`);
            return true;
          }
        }
        
        // Strategy 3: Match by name (fallback)
        if (si.name && foLineItem.name) {
          if (si.name.toLowerCase().trim() === foLineItem.name.toLowerCase().trim()) {
            console.log(`✅ Matched by name: ${si.name}`);
            return true;
          }
        }
        
        return false;
      });

      if (shippedItem) {
        const qtyToFulfill = Math.min(
          shippedItem.quantity,
          foLineItem.fulfillable_quantity || foLineItem.remainingQuantity || foLineItem.quantity
        );

        // Use the GID directly if available, otherwise construct it
        const lineItemGid = foLineItem.fulfillment_order_line_item_gid || 
          (foLineItem.id.startsWith('gid://') ? foLineItem.id : `gid://shopify/FulfillmentOrderLineItem/${foLineItem.id}`);

        fulfillmentOrderLineItems.push({
          id: lineItemGid,
          quantity: qtyToFulfill
        });

        console.log(`✅ Will fulfill: ${foLineItem.sku || foLineItem.name} - ${qtyToFulfill} units`);
      } else {
        console.warn(`⚠️ No match found for FO line item:`, {
          id: foLineItem.id,
          sku: foLineItem.sku,
          name: foLineItem.name,
          variant_id: foLineItem.variant_id
        });
      }
    }
  } else {
    // No item tracking - fulfill all line items
    for (const foLineItem of lineItems) {
      const lineItemGid = foLineItem.fulfillment_order_line_item_gid ||
        (foLineItem.id.startsWith('gid://') ? foLineItem.id : `gid://shopify/FulfillmentOrderLineItem/${foLineItem.id}`);
      
      fulfillmentOrderLineItems.push({
        id: lineItemGid,
        quantity: foLineItem.fulfillable_quantity || foLineItem.remainingQuantity || foLineItem.quantity
      });
    }
  }

  if (fulfillmentOrderLineItems.length === 0) {
    console.warn('No items to fulfill');
    return new Response(
      JSON.stringify({ message: 'No matching items to fulfill' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }

  // Ensure fulfillment order ID is a GID
  const fulfillmentOrderGid = fulfillmentOrderData.fulfillment_order_id.startsWith('gid://')
    ? fulfillmentOrderData.fulfillment_order_id
    : `gid://shopify/FulfillmentOrder/${fulfillmentOrderData.fulfillment_order_id}`;

  // Create fulfillment using GraphQL mutation
  const mutation = `
    mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {
      fulfillmentCreate(fulfillment: $fulfillment) {
        fulfillment {
          id
          status
          createdAt
          trackingInfo {
            number
            url
            company
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    fulfillment: {
      lineItemsByFulfillmentOrder: [
        {
          fulfillmentOrderId: fulfillmentOrderGid,
          fulfillmentOrderLineItems: fulfillmentOrderLineItems
        }
      ],
      trackingInfo: {
        number: trackingNumber,
        url: trackingUrl,
        company: carrier
      },
      notifyCustomer: true
    }
  };

  console.log('Creating fulfillment with variables:', JSON.stringify(variables, null, 2));

  const result = await shopifyGraphQL(store.store_url, store.access_token, mutation, variables);

  if (result.fulfillmentCreate.userErrors?.length > 0) {
    const errors = result.fulfillmentCreate.userErrors;
    console.error('Fulfillment creation errors:', errors);

    await supabase.from('shopify_sync_logs').insert({
      company_id: order.company_id,
      sync_type: 'fulfillment',
      direction: 'outbound',
      status: 'error',
      shopify_order_id: mapping.shopify_order_id,
      ship_tornado_order_id: orderShipment.order_id,
      error_message: errors.map((e: any) => e.message).join(', '),
      metadata: { userErrors: errors }
    });

    throw new Error(`Fulfillment errors: ${errors.map((e: any) => e.message).join(', ')}`);
  }

  const fulfillment = result.fulfillmentCreate.fulfillment;
  console.log('✅ Fulfillment created:', fulfillment.id);

  // Update local fulfillment order record if it exists
  if (fulfillmentOrderData.id) {
    await supabase
      .from('shopify_fulfillment_orders')
      .update({
        status: 'closed',
        fulfillment_id: fulfillment.id,
        fulfilled_at: new Date().toISOString()
      })
      .eq('id', fulfillmentOrderData.id);
  }

  // Update mapping
  await supabase
    .from('shopify_order_mappings')
    .update({
      last_synced_at: new Date().toISOString(),
      sync_status: 'synced',
      metadata: {
        last_fulfillment_id: fulfillment.id,
        last_tracking_number: trackingNumber
      }
    })
    .eq('shopify_order_id', mapping.shopify_order_id);

  // Log success
  await supabase.from('shopify_sync_logs').insert({
    company_id: order.company_id,
    sync_type: 'fulfillment',
    direction: 'outbound',
    status: 'success',
    shopify_order_id: mapping.shopify_order_id,
    ship_tornado_order_id: orderShipment.order_id,
    metadata: {
      fulfillment_id: fulfillment.id,
      tracking_number: trackingNumber,
      items_fulfilled: fulfillmentOrderLineItems.length
    }
  });

  return new Response(
    JSON.stringify({ 
      success: true,
      fulfillmentId: fulfillment.id,
      status: fulfillment.status
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Legacy Flow - Uses fulfillment orders from Shopify API directly (no fulfillment service)
async function handleLegacyFlow(
  supabase: any,
  store: any,
  orderShipment: any,
  order: any,
  mapping: any,
  trackingNumber: string,
  trackingUrl: string,
  carrier: string,
  shopifyOrderId: string
) {
  console.log('Using GraphQL fulfillment (legacy - no fulfillment service)');

  // Fetch fulfillment orders from Shopify
  const shopifyFOs = await fetchFulfillmentOrdersFromShopify(
    store.store_url,
    store.access_token,
    shopifyOrderId
  );

  if (shopifyFOs.length === 0) {
    console.warn('No open fulfillment orders from Shopify');
    return new Response(
      JSON.stringify({ message: 'No open fulfillment orders' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }

  const fo = shopifyFOs[0];
  const foLineItems = fo.lineItems.nodes;

  // Build line items
  const fulfillmentOrderLineItems: Array<{ id: string; quantity: number }> = [];

  if (orderShipment.package_info?.items && Array.isArray(orderShipment.package_info.items)) {
    const shippedItems = orderShipment.package_info.items;

    for (const foLineItem of foLineItems) {
      if (foLineItem.remainingQuantity <= 0) continue;

      const shippedItem = shippedItems.find((si: any) => {
        if (si.sku && foLineItem.lineItem?.sku) return si.sku === foLineItem.lineItem.sku;
        if (si.name && foLineItem.lineItem?.name) return si.name.toLowerCase().trim() === foLineItem.lineItem.name.toLowerCase().trim();
        return false;
      });

      if (shippedItem) {
        fulfillmentOrderLineItems.push({
          id: foLineItem.id,
          quantity: Math.min(shippedItem.quantity, foLineItem.remainingQuantity)
        });
      }
    }
  } else {
    for (const foLineItem of foLineItems) {
      if (foLineItem.remainingQuantity > 0) {
        fulfillmentOrderLineItems.push({
          id: foLineItem.id,
          quantity: foLineItem.remainingQuantity
        });
      }
    }
  }

  if (fulfillmentOrderLineItems.length === 0) {
    return new Response(
      JSON.stringify({ message: 'No items to fulfill' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }

  const mutation = `
    mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {
      fulfillmentCreate(fulfillment: $fulfillment) {
        fulfillment {
          id
          status
          trackingInfo { number url company }
        }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    fulfillment: {
      lineItemsByFulfillmentOrder: [{
        fulfillmentOrderId: fo.id,
        fulfillmentOrderLineItems
      }],
      trackingInfo: {
        number: trackingNumber,
        url: trackingUrl,
        company: carrier
      },
      notifyCustomer: true
    }
  };

  console.log('Creating fulfillment (legacy GraphQL):', JSON.stringify(variables, null, 2));

  const result = await shopifyGraphQL(store.store_url, store.access_token, mutation, variables);

  if (result.fulfillmentCreate.userErrors?.length > 0) {
    const errors = result.fulfillmentCreate.userErrors;
    throw new Error(`Fulfillment errors: ${errors.map((e: any) => e.message).join(', ')}`);
  }

  const fulfillment = result.fulfillmentCreate.fulfillment;
  console.log('✅ Fulfillment created (legacy):', fulfillment.id);

  await supabase.from('shopify_sync_logs').insert({
    company_id: order.company_id,
    sync_type: 'fulfillment',
    direction: 'outbound',
    status: 'success',
    shopify_order_id: mapping.shopify_order_id,
    ship_tornado_order_id: orderShipment.order_id,
    metadata: {
      fulfillment_id: fulfillment.id,
      tracking_number: trackingNumber,
      items_fulfilled: fulfillmentOrderLineItems.length,
      method: 'legacy_graphql'
    }
  });

  return new Response(
    JSON.stringify({ success: true, fulfillmentId: fulfillment.id, method: 'legacy' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

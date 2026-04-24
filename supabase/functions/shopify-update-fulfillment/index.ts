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

async function shopifyRest(
  storeUrl: string,
  accessToken: string,
  path: string,
  method: string = 'GET',
  body?: any
) {
  const response = await fetch(`https://${storeUrl}${path}`, {
    method,
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`REST HTTP error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

function normalizeShopifyResourceId(value: any, resource: string) {
  const raw = value?.toString().trim() ?? '';
  const prefix = `gid://shopify/${resource}/`;
  return raw.startsWith(prefix) ? raw.replace(prefix, '') : raw;
}

async function fetchOrderFulfillments(
  storeUrl: string,
  accessToken: string,
  shopifyOrderId: string
) {
  const response = await shopifyRest(
    storeUrl,
    accessToken,
    `/admin/api/2025-01/orders/${shopifyOrderId}/fulfillments.json`
  );

  return response?.fulfillments || [];
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
      .select('shopify_order_id, shopify_store_id, metadata')
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

    // Per-shipment dedup: only treat this as a "tracking update on existing fulfillment"
    // if THIS specific shipment_id has already been synced before. For multi-package
    // shipments each package is its own shipment_id and must create its OWN fulfillment
    // covering only the items in that package. Reusing the prior fulfillment_id (which
    // was the previous behaviour) overwrote pkg1's tracking number with pkg2's and left
    // pkg2's items unfulfilled.
    const { data: priorSyncForShipment } = await supabase
      .from('shopify_sync_logs')
      .select('id, metadata')
      .eq('ship_tornado_order_id', orderShipment.order_id)
      .eq('sync_type', 'fulfillment')
      .eq('direction', 'outbound')
      .eq('status', 'success')
      .filter('metadata->>shipment_id', 'eq', String(shipmentId))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const priorFulfillmentIdForShipment = priorSyncForShipment?.metadata?.fulfillment_id || null;
    let trackingOnlyTarget: any = null;
    if (priorFulfillmentIdForShipment) {
      const existingShopifyFulfillments = await fetchOrderFulfillments(
        store.store_url,
        store.access_token,
        shopifyOrderId
      );
      trackingOnlyTarget = existingShopifyFulfillments.find((fulfillment: any) => {
        const fulfillmentId = normalizeShopifyResourceId(
          fulfillment?.admin_graphql_api_id || fulfillment?.id,
          'Fulfillment'
        );
        return fulfillmentId === normalizeShopifyResourceId(priorFulfillmentIdForShipment, 'Fulfillment');
      });
    }

    if (trackingOnlyTarget) {
      console.log(`ℹ️ Existing Shopify fulfillment for shipment ${shipmentId}; updating tracking only:`, trackingOnlyTarget.id);
      const trackingOnlyResult = await updateFulfillmentTrackingInfo(
        store.store_url,
        store.access_token,
        trackingOnlyTarget.admin_graphql_api_id || `gid://shopify/Fulfillment/${trackingOnlyTarget.id}`,
        trackingNumber
      );

      await supabase
        .from('shopify_order_mappings')
        .update({
          last_synced_at: new Date().toISOString(),
          sync_status: 'synced',
          metadata: {
            ...mapping.metadata,
            last_fulfillment_id: trackingOnlyTarget.admin_graphql_api_id || `gid://shopify/Fulfillment/${trackingOnlyTarget.id}`,
            last_tracking_number: trackingNumber,
            last_carrier: carrier,
            last_service: service,
            last_flow: 'tracking_update_only',
            tracking_info: trackingOnlyResult?.trackingInfo ?? null
          }
        })
        .eq('shopify_order_id', mapping.shopify_order_id);

      await supabase.from('shopify_sync_logs').insert({
        company_id: order.company_id,
        sync_type: 'fulfillment',
        direction: 'outbound',
        status: 'success',
        shopify_order_id: mapping.shopify_order_id,
        ship_tornado_order_id: orderShipment.order_id,
        metadata: {
          shipment_id: String(shipmentId),
          package_index: orderShipment.package_index ?? 0,
          fulfillment_id: trackingOnlyTarget.admin_graphql_api_id || `gid://shopify/Fulfillment/${trackingOnlyTarget.id}`,
          tracking_number: trackingNumber,
          carrier,
          service,
          flow: 'tracking_update_only',
          tracking_info: trackingOnlyResult?.trackingInfo ?? null
        }
      });

      return new Response(
        JSON.stringify({
          success: true,
          fulfillmentId: trackingOnlyTarget.admin_graphql_api_id || `gid://shopify/Fulfillment/${trackingOnlyTarget.id}`,
          method: 'tracking_update_only'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

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
        service,
        shopifyOrderId,
        shipmentId
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
        service,
        shopifyOrderId,
        shipmentId
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

async function cancelExistingFulfillment(
  storeUrl: string,
  accessToken: string,
  fulfillmentId: string
) {
  const mutation = `
    mutation fulfillmentCancel($id: ID!) {
      fulfillmentCancel(id: $id) {
        fulfillment {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const result = await shopifyGraphQL(storeUrl, accessToken, mutation, { id: fulfillmentId });
  const errors = result?.fulfillmentCancel?.userErrors || [];

  if (errors.length > 0) {
    throw new Error(`Fulfillment cancel errors: ${errors.map((e: any) => e.message).join(', ')}`);
  }

  console.log('✅ Existing fulfillment canceled:', result?.fulfillmentCancel?.fulfillment?.id);
  return result?.fulfillmentCancel?.fulfillment ?? null;
}

async function updateFulfillmentTrackingInfo(
  storeUrl: string,
  accessToken: string,
  fulfillmentId: string,
  trackingNumber: string
) {
  const mutation = `
    mutation fulfillmentTrackingInfoUpdate($fulfillmentId: ID!, $trackingInfoInput: FulfillmentTrackingInput!, $notifyCustomer: Boolean) {
      fulfillmentTrackingInfoUpdate(
        fulfillmentId: $fulfillmentId
        trackingInfoInput: $trackingInfoInput
        notifyCustomer: $notifyCustomer
      ) {
        fulfillment {
          id
          status
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

  const result = await shopifyGraphQL(storeUrl, accessToken, mutation, {
    fulfillmentId,
    trackingInfoInput: {
      number: trackingNumber
    },
    notifyCustomer: true
  });

  const errors = result?.fulfillmentTrackingInfoUpdate?.userErrors || [];
  if (errors.length > 0) {
    throw new Error(`Tracking update errors: ${errors.map((e: any) => e.message).join(', ')}`);
  }

  console.log('✅ Fulfillment tracking updated:', fulfillmentId);
  return result?.fulfillmentTrackingInfoUpdate?.fulfillment ?? null;
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
  service: string,
  shopifyOrderId: string,
  shipmentId: number | string
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
  const matchStrategiesUsed: string[] = [];
  const shippedItemsSummary: any[] = [];
  const foItemsSummary: any[] = [];

  const normalizeVariantGid = (v: any) =>
    v ? v.toString().replace('gid://shopify/ProductVariant/', '').trim() : '';
  const normalizeText = (v: any) =>
    v ? v.toString().toLowerCase().trim() : '';

  if (orderShipment.package_info?.items && Array.isArray(orderShipment.package_info.items)) {
    const shippedItems = orderShipment.package_info.items;

    shippedItems.forEach((si: any) => shippedItemsSummary.push({
      sku: si.sku, name: si.name, quantity: si.quantity, variant_id: si.shopifyVariantId
    }));
    lineItems.forEach((li: any) => foItemsSummary.push({
      id: li.id, sku: li.sku, name: li.name, variant_id: li.variant_id,
      remaining: li.remainingQuantity ?? li.fulfillable_quantity ?? li.quantity
    }));

    console.log('Items in this shipment:', shippedItemsSummary);
    console.log('Fulfillment order line items:', foItemsSummary);

    // Filter to only line items that still have quantity to fulfill
    const availableLineItems = lineItems.filter((li: any) =>
      (li.remainingQuantity || li.fulfillable_quantity || li.quantity || 0) > 0
    );

    console.log(`Available line items with remaining quantity: ${availableLineItems.length} of ${lineItems.length}`);

    for (const foLineItem of availableLineItems) {
      let matchedBy: string | null = null;

      const shippedItem = shippedItems.find((si: any) => {
        // Strategy 1: Match by Shopify variant ID (normalized)
        if (si.shopifyVariantId && foLineItem.variant_id) {
          if (normalizeVariantGid(si.shopifyVariantId) === normalizeVariantGid(foLineItem.variant_id)) {
            matchedBy = 'variant_id';
            return true;
          }
        }
        // Strategy 2: Match by SKU (case-insensitive, trimmed)
        if (si.sku && foLineItem.sku) {
          if (normalizeText(si.sku) === normalizeText(foLineItem.sku)) {
            matchedBy = 'sku';
            return true;
          }
        }
        // Strategy 3: Match by name (case-insensitive, trimmed)
        if (si.name && foLineItem.name) {
          if (normalizeText(si.name) === normalizeText(foLineItem.name)) {
            matchedBy = 'name';
            return true;
          }
        }
        return false;
      });

      if (shippedItem && matchedBy) {
        const remaining = foLineItem.fulfillable_quantity ?? foLineItem.remainingQuantity ?? foLineItem.quantity ?? 0;
        const qtyToFulfill = Math.max(0, Math.min(shippedItem.quantity, remaining));
        if (qtyToFulfill <= 0) {
          console.warn(`⚠️ Skipping line item with zero remaining capacity:`, foLineItem);
          continue;
        }

        const lineItemGid = foLineItem.fulfillment_order_line_item_gid ||
          (foLineItem.id.startsWith('gid://') ? foLineItem.id : `gid://shopify/FulfillmentOrderLineItem/${foLineItem.id}`);

        fulfillmentOrderLineItems.push({ id: lineItemGid, quantity: qtyToFulfill });
        matchStrategiesUsed.push(matchedBy);
        console.log(`✅ Will fulfill: ${foLineItem.sku || foLineItem.name} - ${qtyToFulfill} units (matched by ${matchedBy})`);
      } else {
        console.warn(`⚠️ No match found for FO line item:`, {
          id: foLineItem.id, sku: foLineItem.sku, name: foLineItem.name, variant_id: foLineItem.variant_id
        });
      }
    }

    // Defensive guard: shipped items present but zero matches → abort, do not create blank fulfillment
    if (shippedItems.length > 0 && fulfillmentOrderLineItems.length === 0) {
      const errorMsg = 'Shipped items did not match any fulfillment-order line items; aborting to avoid blank fulfillment';
      console.error(`❌ ${errorMsg}`);
      await supabase.from('shopify_sync_logs').insert({
        company_id: order.company_id,
        sync_type: 'fulfillment',
        direction: 'outbound',
        status: 'error',
        shopify_order_id: mapping.shopify_order_id,
        ship_tornado_order_id: orderShipment.order_id,
        error_message: errorMsg,
        metadata: {
          reason: 'no_item_matches',
          flow: 'fulfillment_service',
          shipped_items: shippedItemsSummary,
          fulfillment_order_items: foItemsSummary,
          tracking_number: trackingNumber,
          service,
          carrier
        }
      });
      return new Response(
        JSON.stringify({ error: errorMsg, shipped_items: shippedItemsSummary, fulfillment_order_items: foItemsSummary }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } else {
    // No item tracking - fulfill all line items
    for (const foLineItem of lineItems) {
      const remaining = foLineItem.fulfillable_quantity ?? foLineItem.remainingQuantity ?? foLineItem.quantity ?? 0;
      if (remaining <= 0) continue;
      const lineItemGid = foLineItem.fulfillment_order_line_item_gid ||
        (foLineItem.id.startsWith('gid://') ? foLineItem.id : `gid://shopify/FulfillmentOrderLineItem/${foLineItem.id}`);
      fulfillmentOrderLineItems.push({ id: lineItemGid, quantity: remaining });
      matchStrategiesUsed.push('all_remaining');
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
      // Send only the tracking number — Shopify auto-detects carrier and URL
      trackingInfo: {
        number: trackingNumber
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

  const trackingFulfillment = await updateFulfillmentTrackingInfo(
    store.store_url,
    store.access_token,
    fulfillment.id,
    trackingNumber
  );

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
        last_tracking_number: trackingNumber,
        last_carrier: carrier,
        last_service: service,
        last_flow: 'fulfillment_service',
        tracking_info: trackingFulfillment?.trackingInfo ?? fulfillment.trackingInfo ?? null
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
      shipment_id: String(shipmentId),
      package_index: orderShipment.package_index ?? 0,
      fulfillment_id: fulfillment.id,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      carrier,
      service,
      flow: 'fulfillment_service',
      items_fulfilled: fulfillmentOrderLineItems.length,
      match_strategies: matchStrategiesUsed,
      shipped_items: shippedItemsSummary,
      fulfillment_order_items: foItemsSummary,
      tracking_info: trackingFulfillment?.trackingInfo ?? fulfillment.trackingInfo ?? null
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
  service: string,
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
  const matchStrategiesUsed: string[] = [];
  const shippedItemsSummary: any[] = [];
  const foItemsSummary: any[] = foLineItems.map((li: any) => ({
    id: li.id,
    sku: li.lineItem?.sku,
    name: li.lineItem?.name,
    variant_id: li.lineItem?.variant?.id,
    remaining: li.remainingQuantity
  }));

  const normalizeVariantGid = (v: any) =>
    v ? v.toString().replace('gid://shopify/ProductVariant/', '').trim() : '';
  const normalizeText = (v: any) =>
    v ? v.toString().toLowerCase().trim() : '';

  if (orderShipment.package_info?.items && Array.isArray(orderShipment.package_info.items)) {
    const shippedItems = orderShipment.package_info.items;
    shippedItems.forEach((si: any) => shippedItemsSummary.push({
      sku: si.sku, name: si.name, quantity: si.quantity, variant_id: si.shopifyVariantId
    }));

    for (const foLineItem of foLineItems) {
      if (foLineItem.remainingQuantity <= 0) continue;
      let matchedBy: string | null = null;

      const shippedItem = shippedItems.find((si: any) => {
        if (si.shopifyVariantId && foLineItem.lineItem?.variant?.id) {
          if (normalizeVariantGid(si.shopifyVariantId) === normalizeVariantGid(foLineItem.lineItem.variant.id)) {
            matchedBy = 'variant_id';
            return true;
          }
        }
        if (si.sku && foLineItem.lineItem?.sku) {
          if (normalizeText(si.sku) === normalizeText(foLineItem.lineItem.sku)) {
            matchedBy = 'sku';
            return true;
          }
        }
        if (si.name && foLineItem.lineItem?.name) {
          if (normalizeText(si.name) === normalizeText(foLineItem.lineItem.name)) {
            matchedBy = 'name';
            return true;
          }
        }
        return false;
      });

      if (shippedItem && matchedBy) {
        const qty = Math.max(0, Math.min(shippedItem.quantity, foLineItem.remainingQuantity));
        if (qty <= 0) continue;
        fulfillmentOrderLineItems.push({ id: foLineItem.id, quantity: qty });
        matchStrategiesUsed.push(matchedBy);
      }
    }

    // Defensive guard
    if (shippedItems.length > 0 && fulfillmentOrderLineItems.length === 0) {
      const errorMsg = 'Shipped items did not match any fulfillment-order line items; aborting to avoid blank fulfillment';
      console.error(`❌ ${errorMsg}`);
      await supabase.from('shopify_sync_logs').insert({
        company_id: order.company_id,
        sync_type: 'fulfillment',
        direction: 'outbound',
        status: 'error',
        shopify_order_id: mapping.shopify_order_id,
        ship_tornado_order_id: orderShipment.order_id,
        error_message: errorMsg,
        metadata: {
          reason: 'no_item_matches',
          flow: 'legacy',
          shipped_items: shippedItemsSummary,
          fulfillment_order_items: foItemsSummary,
          tracking_number: trackingNumber,
          service,
          carrier
        }
      });
      return new Response(
        JSON.stringify({ error: errorMsg, shipped_items: shippedItemsSummary, fulfillment_order_items: foItemsSummary }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } else {
    for (const foLineItem of foLineItems) {
      if (foLineItem.remainingQuantity > 0) {
        fulfillmentOrderLineItems.push({
          id: foLineItem.id,
          quantity: foLineItem.remainingQuantity
        });
        matchStrategiesUsed.push('all_remaining');
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
      // Send only the tracking number — Shopify auto-detects carrier and URL
      trackingInfo: {
        number: trackingNumber
      },
      notifyCustomer: true
    }
  };

  console.log('Creating fulfillment (legacy GraphQL):', JSON.stringify(variables, null, 2));

  const result = await shopifyGraphQL(store.store_url, store.access_token, mutation, variables);

  if (result.fulfillmentCreate.userErrors?.length > 0) {
    const errors = result.fulfillmentCreate.userErrors;
    await supabase.from('shopify_sync_logs').insert({
      company_id: order.company_id,
      sync_type: 'fulfillment',
      direction: 'outbound',
      status: 'error',
      shopify_order_id: mapping.shopify_order_id,
      ship_tornado_order_id: orderShipment.order_id,
      error_message: errors.map((e: any) => e.message).join(', '),
      metadata: { userErrors: errors, flow: 'legacy', tracking_number: trackingNumber, carrier, service }
    });
    throw new Error(`Fulfillment errors: ${errors.map((e: any) => e.message).join(', ')}`);
  }

  const fulfillment = result.fulfillmentCreate.fulfillment;
  console.log('✅ Fulfillment created (legacy):', fulfillment.id);

  const trackingFulfillment = await updateFulfillmentTrackingInfo(
    store.store_url,
    store.access_token,
    fulfillment.id,
    trackingNumber
  );

  // Update mapping
  await supabase
    .from('shopify_order_mappings')
    .update({
      last_synced_at: new Date().toISOString(),
      sync_status: 'synced',
      metadata: {
        last_fulfillment_id: fulfillment.id,
        last_tracking_number: trackingNumber,
        last_carrier: carrier,
        last_service: service,
        last_flow: 'legacy',
        tracking_info: trackingFulfillment?.trackingInfo ?? fulfillment.trackingInfo ?? null
      }
    })
    .eq('shopify_order_id', mapping.shopify_order_id);

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
      tracking_url: trackingUrl,
      carrier,
      service,
      flow: 'legacy',
      items_fulfilled: fulfillmentOrderLineItems.length,
      match_strategies: matchStrategiesUsed,
      shipped_items: shippedItemsSummary,
      fulfillment_order_items: foItemsSummary,
      tracking_info: trackingFulfillment?.trackingInfo ?? fulfillment.trackingInfo ?? null
    }
  });

  return new Response(
    JSON.stringify({ success: true, fulfillmentId: fulfillment.id, method: 'legacy' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

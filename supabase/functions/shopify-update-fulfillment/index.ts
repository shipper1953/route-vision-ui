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
  const apiVersion = '2025-01';
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

  const requestBody = await req.json();
  const { shipmentId, status, trackingNumber, trackingUrl, carrier } = requestBody;

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
      .select('items, company_id')
      .eq('id', orderShipment.order_id)
      .single();

    if (orderError) {
      throw new Error(`Failed to query order: ${orderError.message}`);
    }

    // Get Shopify order mapping
    const { data: mapping, error: mappingError } = await supabase
      .from('shopify_order_mappings')
      .select('shopify_order_id')
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

    // Get company Shopify settings
    const { data: company } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', order.company_id)
      .single();

    const shopifySettings = company?.settings?.shopify;

    if (!shopifySettings?.access_token) {
      throw new Error('Shopify not connected');
    }

    // Extract Shopify order ID (numeric)
    const shopifyOrderId = mapping.shopify_order_id.split('/').pop();

    console.log('Processing fulfillment for Shopify order:', shopifyOrderId);

    // Check if fulfillment service is registered
    const hasFulfillmentService = !!shopifySettings.fulfillment_service?.id;

    if (hasFulfillmentService) {
      console.log('✅ Using fulfillment service flow');
      return await handleFulfillmentServiceFlow(
        supabase,
        shopifySettings,
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
        shopifySettings,
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

// Fulfillment Service Flow - Uses fulfillment orders
async function handleFulfillmentServiceFlow(
  supabase: any,
  shopifySettings: any,
  orderShipment: any,
  order: any,
  mapping: any,
  trackingNumber: string,
  trackingUrl: string,
  carrier: string,
  shopifyOrderId: string
) {
  console.log('Fetching fulfillment order for order:', orderShipment.order_id);

  // Get fulfillment order for this Ship Tornado order
  const { data: fulfillmentOrders, error: foError } = await supabase
    .from('shopify_fulfillment_orders')
    .select('*')
    .eq('ship_tornado_order_id', orderShipment.order_id)
    .not('status', 'in', '("closed","cancelled")');
  
  console.log(`Found ${fulfillmentOrders?.length || 0} fulfillment orders with status: ${fulfillmentOrders?.map(fo => fo.status).join(', ')}`);

  if (foError) {
    console.error('Error fetching fulfillment orders:', foError);
    throw new Error(`Failed to fetch fulfillment orders: ${foError.message}`);
  }

  if (!fulfillmentOrders || fulfillmentOrders.length === 0) {
    console.warn('No open fulfillment orders found - order may not be assigned yet');
    
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

  const fulfillmentOrder = fulfillmentOrders[0];
  console.log('Found fulfillment order:', fulfillmentOrder.fulfillment_order_id);

  // Build line items for fulfillment
  const fulfillmentOrderLineItems: Array<{ id: string; quantity: number }> = [];

  if (orderShipment.package_info?.items && Array.isArray(orderShipment.package_info.items)) {
    const shippedItems = orderShipment.package_info.items;
    
    console.log('Items in this shipment:', shippedItems.map((si: any) => ({
      sku: si.sku,
      name: si.name,
      quantity: si.quantity
    })));

    // Match shipped items to fulfillment order line items
    console.log('Fulfillment order line items:', JSON.stringify(fulfillmentOrder.line_items, null, 2));
    
    // Filter to only line items that still have quantity to fulfill
    const availableLineItems = fulfillmentOrder.line_items.filter((li: any) => 
      (li.remainingQuantity || li.fulfillable_quantity || 0) > 0
    );
    
    console.log(`Available line items with remaining quantity: ${availableLineItems.length} of ${fulfillmentOrder.line_items.length}`);
    
    for (const foLineItem of availableLineItems) {
      // Try multiple matching strategies
      const shippedItem = shippedItems.find((si: any) => {
        // Strategy 1: Match by Shopify variant ID (most reliable)
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
        
        // Strategy 3: Match by itemId (UUID from items table)
        if (si.itemId && foLineItem.line_item_id) {
          if (si.itemId === foLineItem.line_item_id?.toString()) {
            console.log(`✅ Matched by itemId: ${si.itemId}`);
            return true;
          }
        }
        
        // Strategy 4: Match by name (fallback)
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
          foLineItem.fulfillable_quantity || foLineItem.quantity
        );

        fulfillmentOrderLineItems.push({
          id: `gid://shopify/FulfillmentOrderLineItem/${foLineItem.id}`,
          quantity: qtyToFulfill
        });

        console.log(`✅ Will fulfill: ${foLineItem.sku || foLineItem.name} - ${qtyToFulfill} units`);
      } else {
        console.warn(`⚠️ No match found for FO line item:`, {
          id: foLineItem.id,
          sku: foLineItem.sku,
          name: foLineItem.name,
          variant_id: foLineItem.variant_id,
          line_item_id: foLineItem.line_item_id
        });
        console.warn(`Available shipped items:`, shippedItems.map((si: any) => ({
          sku: si.sku,
          name: si.name,
          itemId: si.itemId,
          shopifyVariantId: si.shopifyVariantId
        })));
      }
    }
  } else {
    // No item tracking - fulfill all line items
    for (const foLineItem of fulfillmentOrder.line_items) {
      fulfillmentOrderLineItems.push({
        id: `gid://shopify/FulfillmentOrderLineItem/${foLineItem.id}`,
        quantity: foLineItem.fulfillable_quantity || foLineItem.quantity
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

  // Create fulfillment using modern GraphQL mutation
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
          fulfillmentOrderId: fulfillmentOrder.fulfillment_order_id,
          fulfillmentOrderLineItems: fulfillmentOrderLineItems
        }
      ],
      trackingInfo: {
        number: trackingNumber,
        url: trackingUrl,
        company: carrier
      },
      notifyCustomer: shopifySettings.sync_config?.fulfillment?.notify_customer !== false
    }
  };

  console.log('Creating fulfillment with variables:', JSON.stringify(variables, null, 2));

  const result = await shopifyGraphQL(shopifySettings, mutation, variables);

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

  // Update fulfillment order record
  await supabase
    .from('shopify_fulfillment_orders')
    .update({
      status: 'closed',
      fulfillment_id: fulfillment.id,
      fulfilled_at: new Date().toISOString()
    })
    .eq('id', fulfillmentOrder.id);

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

// Legacy Flow - Direct line item fulfillment (fallback)
async function handleLegacyFlow(
  supabase: any,
  shopifySettings: any,
  orderShipment: any,
  order: any,
  mapping: any,
  trackingNumber: string,
  trackingUrl: string,
  carrier: string,
  shopifyOrderId: string
) {
  console.log('Using REST API for fulfillment (legacy)');

  // Fetch order from Shopify REST API
  const orderResponse = await fetch(
    `https://${shopifySettings.store_url}/admin/api/2025-01/orders/${shopifyOrderId}.json`,
    {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': shopifySettings.access_token,
        'Content-Type': 'application/json',
      }
    }
  );

  if (!orderResponse.ok) {
    throw new Error(`Failed to fetch order: ${orderResponse.status}`);
  }

  const orderData = await orderResponse.json();
  const lineItems = orderData.order.line_items;

  console.log('Fetched order line items:', lineItems.length);

  // Build line items for fulfillment
  const lineItemsForFulfillment: Array<{ id: number; quantity: number }> = [];

  if (orderShipment.package_info?.items && Array.isArray(orderShipment.package_info.items)) {
    const shippedItems = orderShipment.package_info.items;

    for (const lineItem of lineItems) {
      const shippedItem = shippedItems.find((si: any) =>
        si.sku === lineItem.sku || si.name === lineItem.name
      );

      if (shippedItem) {
        const remainingQty = lineItem.quantity - (lineItem.fulfilled_quantity || 0);
        const qtyToFulfill = Math.min(shippedItem.quantity, remainingQty);

        if (qtyToFulfill > 0) {
          lineItemsForFulfillment.push({
            id: lineItem.id,
            quantity: qtyToFulfill
          });
        }
      }
    }
  } else {
    // No item tracking - fulfill all remaining items
    for (const lineItem of lineItems) {
      const remainingQty = lineItem.quantity - (lineItem.fulfilled_quantity || 0);
      if (remainingQty > 0) {
        lineItemsForFulfillment.push({
          id: lineItem.id,
          quantity: remainingQty
        });
      }
    }
  }

  if (lineItemsForFulfillment.length === 0) {
    console.warn('No items to fulfill');
    return new Response(
      JSON.stringify({ message: 'No items to fulfill' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }

  // Create fulfillment via REST API
  const fulfillmentPayload = {
    fulfillment: {
      line_items: lineItemsForFulfillment,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      tracking_company: carrier,
      notify_customer: shopifySettings.sync_config?.fulfillment?.notify_customer !== false
    }
  };

  console.log('Creating fulfillment (REST):', fulfillmentPayload);

  const fulfillmentResponse = await fetch(
    `https://${shopifySettings.store_url}/admin/api/2025-01/orders/${shopifyOrderId}/fulfillments.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': shopifySettings.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fulfillmentPayload)
    }
  );

  if (!fulfillmentResponse.ok) {
    const errorText = await fulfillmentResponse.text();
    console.error('Fulfillment creation failed:', errorText);
    throw new Error(`Failed to create fulfillment: ${errorText}`);
  }

  const fulfillmentData = await fulfillmentResponse.json();
  const fulfillment = fulfillmentData.fulfillment;

  console.log('✅ Fulfillment created (REST):', fulfillment.id);

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
      items_fulfilled: lineItemsForFulfillment.length,
      method: 'rest_api_legacy'
    }
  });

  return new Response(
    JSON.stringify({ 
      success: true,
      fulfillmentId: fulfillment.id,
      method: 'legacy'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

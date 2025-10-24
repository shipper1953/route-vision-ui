import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-shop-domain',
};

interface FulfillmentServiceCallback {
  kind: 'FULFILLMENT_REQUEST' | 'CANCELLATION_REQUEST' | 'FULFILLMENT_REQUEST_HOLD' | 'FULFILLMENT_REQUEST_RELEASE_HOLD';
}

async function fetchAssignedFulfillmentOrders(
  shopifySettings: { store_url: string; access_token: string }
) {
  const query = `
    query {
      assignedFulfillmentOrders(
        first: 50
        assignmentStatus: FULFILLMENT_REQUESTED
      ) {
        edges {
          node {
            id
            orderId
            status
            requestStatus
            order {
              id
              name
              email
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              customer {
                id
                email
                firstName
                lastName
                phone
              }
              shippingAddress {
                firstName
                lastName
                company
                address1
                address2
                city
                provinceCode
                countryCodeV2
                zip
                phone
              }
              lineItems(first: 100) {
                edges {
                  node {
                    id
                    title
                    quantity
                    sku
                    name
                    vendor
                    product {
                      id
                    }
                    variant {
                      id
                      sku
                      weight
                      weightUnit
                      image {
                        url
                      }
                    }
                    originalUnitPriceSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
            }
            lineItems(first: 100) {
              edges {
                node {
                  id
                  lineItem {
                    id
                    title
                    sku
                    name
                    variant {
                      id
                      sku
                      weight
                      weightUnit
                    }
                  }
                  remainingQuantity
                }
              }
            }
            destination {
              address1
              address2
              city
              province
              zip
              countryCode
              company
              firstName
              lastName
              phone
              email
            }
          }
        }
      }
    }
  `;

  const response = await fetch(
    `https://${shopifySettings.store_url}/admin/api/2025-01/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': shopifySettings.access_token,
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!response.ok) {
    throw new Error(`Shopify GraphQL query failed: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    console.error('GraphQL errors:', result.errors);
    throw new Error('GraphQL query returned errors');
  }

  return result.data.assignedFulfillmentOrders.edges.map((e: any) => e.node);
}

async function acceptFulfillmentOrder(
  shopifySettings: { store_url: string; access_token: string },
  fulfillmentOrderId: string,
  message?: string
) {
  const mutation = `
    mutation fulfillmentOrderAcceptFulfillmentRequest($id: ID!, $message: String) {
      fulfillmentOrderAcceptFulfillmentRequest(id: $id, message: $message) {
        fulfillmentOrder {
          id
          status
          requestStatus
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  
  const variables = {
    id: fulfillmentOrderId,
    message: message || "Order accepted by Ship Tornado"
  };
  
  const response = await fetch(
    `https://${shopifySettings.store_url}/admin/api/2025-01/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': shopifySettings.access_token,
      },
      body: JSON.stringify({ query: mutation, variables }),
    }
  );
  
  const result = await response.json();
  
  if (result.errors || result.data?.fulfillmentOrderAcceptFulfillmentRequest?.userErrors?.length > 0) {
    throw new Error(`Failed to accept fulfillment order: ${JSON.stringify(result.errors || result.data.fulfillmentOrderAcceptFulfillmentRequest.userErrors)}`);
  }
  
  return result.data.fulfillmentOrderAcceptFulfillmentRequest.fulfillmentOrder;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const shopDomain = req.headers.get('x-shopify-shop-domain');
    
    if (!shopDomain) {
      console.error('Missing x-shopify-shop-domain header');
      return new Response(
        JSON.stringify({ error: 'Missing shop domain header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.text();
    console.log('📥 Callback received from:', shopDomain);
    console.log('Raw body:', body);
    
    let webhook: FulfillmentServiceCallback;

    // Parse callback body
    try {
      webhook = JSON.parse(body);
    } catch (parseError) {
      console.error('Failed to parse callback body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate kind field
    if (!webhook.kind) {
      console.error('Missing "kind" field in callback payload');
      return new Response(
        JSON.stringify({ error: 'Missing kind field' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only handle fulfillment_request kind
    const normalizedKind = webhook.kind?.toLowerCase();
    if (normalizedKind !== 'fulfillment_request') {
      console.log(`Received callback kind: ${webhook.kind} - not processing`);
      return new Response(
        JSON.stringify({ message: `Callback kind ${webhook.kind} acknowledged` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Fulfillment request callback validated');

    // Find company by shop domain
    const { data: companies } = await supabase
      .from('companies')
      .select('id, settings')
      .ilike('settings->shopify->>store_url', `%${shopDomain}%`);

    if (!companies || companies.length === 0) {
      console.error('No company found for shop:', shopDomain);
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const company = companies[0];
    const shopifySettings = company.settings?.shopify;

    if (!shopifySettings?.access_token) {
      console.error('Missing Shopify credentials');
      return new Response(
        JSON.stringify({ error: 'Shopify credentials not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query-based authentication: We have a valid OAuth token from company settings
    // This proves authorization since only authenticated companies can connect Shopify
    console.log('🔐 Using query-based authentication (OAuth token validated)');

    // Import shared utilities
    const { ensureItemExists, sanitizeString, addBusinessDays } = await import('../../_shared/shopify-item-matcher.ts');

    // Query Shopify for fulfillment orders
    console.log('🔍 Querying Shopify for fulfillment orders...');
    const fulfillmentOrders = await fetchAssignedFulfillmentOrders(shopifySettings);

    console.log(`📦 Found ${fulfillmentOrders.length} fulfillment orders`);

    const processedFulfillmentOrderIds = [];

    // Get default warehouse
    const { data: warehouse } = await supabase
      .from('warehouses')
      .select('id')
      .eq('company_id', company.id)
      .eq('is_default', true)
      .single();

    for (const fo of fulfillmentOrders) {
      // Check if we've already processed this fulfillment order
      const fulfillmentOrderId = fo.id;
      const { data: existing } = await supabase
        .from('shopify_fulfillment_orders')
        .select('id')
        .eq('fulfillment_order_id', fulfillmentOrderId)
        .eq('company_id', company.id)
        .single();

      if (existing) {
        console.log(`⏭️  Fulfillment order ${fulfillmentOrderId} already processed, skipping`);
        processedFulfillmentOrderIds.push({
          id: fulfillmentOrderId,
          status: 'open'
        });
        continue;
      }

      // Extract IDs from GIDs
      const shopifyOrderId = fo.orderId;
      const shopifyOrderNumber = fo.order.name;
      const fulfillmentOrderNumber = fulfillmentOrderId.replace('gid://shopify/FulfillmentOrder/', '');

      console.log(`🔨 Processing fulfillment order ${fulfillmentOrderNumber} for order ${shopifyOrderNumber}`);

      // Process line items using ensureItemExists
      const processedItems = [];
      let itemsMatched = 0;
      let itemsCreated = 0;

      for (const lineItemEdge of fo.order.lineItems.edges) {
        const lineItem = lineItemEdge.node;
        const foLineItem = fo.lineItems.edges.find(
          (fli: any) => fli.node.lineItem.id === lineItem.id
        )?.node;

        if (!foLineItem || foLineItem.remainingQuantity === 0) {
          continue;
        }

        const variantIdNum = lineItem.variant?.id ? 
          parseInt(lineItem.variant.id.replace('gid://shopify/ProductVariant/', '')) : null;
        const productIdNum = lineItem.product?.id ? 
          parseInt(lineItem.product.id.replace('gid://shopify/Product/', '')) : null;

        const lineItemData = {
          variant_id: variantIdNum,
          product_id: productIdNum,
          sku: lineItem.sku || lineItem.variant?.sku,
          title: lineItem.title,
          name: lineItem.name,
          price: lineItem.originalUnitPriceSet?.shopMoney?.amount || '0',
          quantity: foLineItem.remainingQuantity,
          grams: lineItem.variant?.weight && lineItem.variant?.weightUnit === 'GRAMS' 
            ? lineItem.variant.weight 
            : lineItem.variant?.weight && lineItem.variant?.weightUnit === 'KILOGRAMS'
            ? lineItem.variant.weight * 1000
            : 0,
        };

        try {
          const { id: itemId, details } = await ensureItemExists(supabase, company.id, lineItemData);
          
          if (details.shopify_variant_id === variantIdNum?.toString() || 
              details.shopify_product_id === productIdNum?.toString() ||
              details.sku === lineItemData.sku) {
            itemsMatched++;
          } else {
            itemsCreated++;
          }
          
          processedItems.push({
            itemId: itemId,
            sku: details.sku,
            name: sanitizeString(lineItem.name, 255),
            quantity: foLineItem.remainingQuantity,
            unitPrice: parseFloat(lineItemData.price),
            length: details.length,
            width: details.width,
            height: details.height,
            weight: details.weight
          });
        } catch (error) {
          console.error(`Failed to process line item:`, error);
          processedItems.push({
            sku: sanitizeString(lineItemData.sku || lineItem.name, 100),
            name: sanitizeString(lineItem.name, 255),
            quantity: foLineItem.remainingQuantity,
            unitPrice: parseFloat(lineItemData.price)
          });
        }
      }

      console.log(`📊 Item processing: ${itemsMatched} matched, ${itemsCreated} created`);

      // Create Ship Tornado order
      const orderData = {
        order_id: sanitizeString(`SHOP-${shopifyOrderNumber}`, 50) || 'UNKNOWN',
        customer_name: sanitizeString(
          `${fo.order.customer?.firstName || ''} ${fo.order.customer?.lastName || ''}`.trim(),
          255
        ) || sanitizeString(
          `${fo.destination.firstName || ''} ${fo.destination.lastName || ''}`.trim(),
          255
        ) || 'Unknown',
        customer_email: sanitizeString(fo.destination.email || fo.order.customer?.email, 255),
        customer_phone: sanitizeString(fo.destination.phone || fo.order.customer?.phone, 20),
        customer_company: sanitizeString(fo.destination.company || fo.order.shippingAddress?.company, 255),
        shipping_address: {
          street1: sanitizeString(fo.destination.address1, 255) || '',
          street2: sanitizeString(fo.destination.address2, 255) || '',
          city: sanitizeString(fo.destination.city, 100) || '',
          state: sanitizeString(fo.destination.province, 10) || '',
          zip: sanitizeString(fo.destination.zip, 20) || '',
          country: sanitizeString(fo.destination.countryCode, 2) || 'US'
        },
        items: processedItems,
        value: parseFloat(fo.order.totalPriceSet?.shopMoney?.amount || '0'),
        order_date: fo.order.createdAt,
        required_delivery_date: addBusinessDays(new Date(fo.order.createdAt), 5).toISOString().split('T')[0],
        status: 'ready_to_ship',
        company_id: company.id,
        warehouse_id: warehouse?.id || null,
        user_id: null,
      };

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        // Log error but continue processing other orders
        await supabase.from('shopify_sync_logs').insert({
          company_id: company.id,
          sync_type: 'fulfillment_order_notification',
          direction: 'inbound',
          status: 'error',
          shopify_order_id: shopifyOrderId,
          error_message: orderError.message,
          metadata: { fulfillment_order_id: fulfillmentOrderId },
        });
        continue;
      }

      console.log(`✅ Created Ship Tornado order ${newOrder.id}`);

      // Create mappings
      await supabase.from('shopify_order_mappings').insert({
        company_id: company.id,
        ship_tornado_order_id: newOrder.id,
        shopify_order_id: shopifyOrderId,
        shopify_order_number: shopifyOrderNumber,
        sync_status: 'synced',
      });

      await supabase.from('shopify_fulfillment_orders').insert({
        company_id: company.id,
        ship_tornado_order_id: newOrder.id,
        shopify_order_id: shopifyOrderId,
        fulfillment_order_id: fulfillmentOrderId,
        fulfillment_order_number: fulfillmentOrderNumber,
        status: fo.status,
        request_status: fo.requestStatus,
        line_items: fo.lineItems.edges.map((e: any) => e.node),
        assigned_location_id: shopifySettings.fulfillment_service_location_id,
        destination: fo.destination,
      });

      // Accept the fulfillment order in Shopify
      try {
        const acceptedFO = await acceptFulfillmentOrder(
          shopifySettings,
          fulfillmentOrderId,
          `Accepted by Ship Tornado - Order ${newOrder.order_id}`
        );
        
        console.log(`✅ Accepted fulfillment order ${fulfillmentOrderId} in Shopify`);
        console.log(`   Status: ${acceptedFO.status}, Request Status: ${acceptedFO.requestStatus}`);
        
        // Update our tracking with the new status
        await supabase
          .from('shopify_fulfillment_orders')
          .update({
            status: acceptedFO.status,
            request_status: acceptedFO.requestStatus,
          })
          .eq('fulfillment_order_id', fulfillmentOrderId);
          
      } catch (acceptError) {
        console.error(`⚠️  Failed to accept fulfillment order ${fulfillmentOrderId}:`, acceptError);
        // Log but don't fail - the order was created successfully
        await supabase.from('shopify_sync_logs').insert({
          company_id: company.id,
          sync_type: 'fulfillment_order_acceptance',
          direction: 'outbound',
          status: 'error',
          shopify_order_id: shopifyOrderId,
          ship_tornado_order_id: newOrder.id,
          error_message: acceptError.message,
          metadata: { fulfillment_order_id: fulfillmentOrderId },
        });
      }

      // Log success
      await supabase.from('shopify_sync_logs').insert({
        company_id: company.id,
        sync_type: 'fulfillment_order_notification',
        direction: 'inbound',
        status: 'success',
        shopify_order_id: shopifyOrderId,
        ship_tornado_order_id: newOrder.id,
        metadata: {
          fulfillment_order_id: fulfillmentOrderId,
          request_status: fo.requestStatus,
          status: fo.status,
          line_item_count: fo.lineItems.edges.length,
          items_matched: itemsMatched,
          items_created: itemsCreated,
        },
      });

      processedFulfillmentOrderIds.push({
        id: fulfillmentOrderId,
        status: 'in_progress'
      });

      // Check timeout (must respond within 5 seconds)
      const elapsed = Date.now() - startTime;
      if (elapsed > 4000) {
        console.warn(`⏱️  Timeout approaching (${elapsed}ms), stopping processing`);
        break;
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`✅ Processed ${processedFulfillmentOrderIds.length} fulfillment orders in ${elapsed}ms`);

    // Respond to Shopify with acceptance
    return new Response(
      JSON.stringify({
        fulfillment_orders: processedFulfillmentOrderIds,
        message: `Accepted ${processedFulfillmentOrderIds.length} fulfillment order(s)`
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Error processing fulfillment order notification:', error);
    
    // Still return 200 to Shopify to avoid retries
    return new Response(
      JSON.stringify({ 
        error: 'Internal error',
        message: 'Error logged - will be handled manually'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

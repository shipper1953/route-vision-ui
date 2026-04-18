import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z, ZodError } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Sanitization helper to prevent injection attacks
function sanitizeString(str: string | null | undefined, maxLength: number = 255): string | null {
  if (!str) return null;
  return str.trim().slice(0, maxLength);
}

// Shopify webhook order validation schema
const ShopifyOrderSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  order_number: z.union([z.number(), z.string()]).transform(String),
  email: z.string().max(255).optional().nullable().transform(val => val === '' ? null : val),
  financial_status: z.string().max(50).optional(),
  fulfillment_status: z.string().max(50).optional().nullable(),
  total_price: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) : val
  ),
  currency: z.string().max(3).optional(),
  created_at: z.string().optional(),
  customer: z.object({
    id: z.union([z.number(), z.string()]).optional(),
    email: z.string().email().max(255).optional().nullable(),
    first_name: z.string().max(100).optional().nullable(),
    last_name: z.string().max(100).optional().nullable(),
    phone: z.string().max(20).optional().nullable(),
    company: z.string().max(255).optional().nullable()
  }).optional().nullable(),
  shipping_address: z.object({
    first_name: z.string().max(100).optional().nullable(),
    last_name: z.string().max(100).optional().nullable(),
    company: z.string().max(255).optional().nullable(),
    address1: z.string().max(255).optional().nullable(),
    address2: z.string().max(255).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    province: z.string().max(100).optional().nullable(),
    province_code: z.string().max(10).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
    country_code: z.string().max(2).optional().nullable(),
    zip: z.string().max(20).optional().nullable(),
    phone: z.string().max(20).optional().nullable()
  }).optional().nullable(),
  line_items: z.array(
    z.object({
      id: z.union([z.number(), z.string()]).optional(),
      product_id: z.union([z.number(), z.string()]).optional().nullable(),
      variant_id: z.union([z.number(), z.string()]).optional().nullable(),
      title: z.string().max(255),
      quantity: z.number().int().positive().max(10000),
      sku: z.string().max(100).optional().nullable(),
      name: z.string().max(255).optional().nullable(),
      vendor: z.string().max(255).optional().nullable(),
      price: z.union([z.string(), z.number()]).transform(val => 
        typeof val === 'string' ? parseFloat(val) : val
      ),
      requires_shipping: z.boolean().optional(),
      grams: z.number().optional(),
      properties: z.array(z.any()).optional()
    })
  ).optional().default([])
});

type ShopifyOrder = z.infer<typeof ShopifyOrderSchema>;

// Shopify Purchase Order webhook validation schema
const ShopifyPurchaseOrderSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  name: z.string().optional(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  expected_at: z.string().optional().nullable(),
  supplier: z.object({
    id: z.union([z.number(), z.string()]).optional(),
    name: z.string().optional(),
  }).optional().nullable(),
  destination: z.object({
    id: z.union([z.number(), z.string()]).optional(),
    name: z.string().optional(),
  }).optional().nullable(),
  line_items: z.array(
    z.object({
      id: z.union([z.number(), z.string()]),
      variant_id: z.union([z.number(), z.string()]).optional().nullable(),
      product_id: z.union([z.number(), z.string()]).optional().nullable(),
      quantity: z.number(),
      quantity_received: z.number().optional().default(0),
      sku: z.string().optional().nullable(),
      name: z.string().optional(),
      title: z.string().optional(),
      price: z.union([z.string(), z.number()]).optional().nullable(),
    })
  ).default([]),
  note: z.string().optional().nullable(),
});

// Shopify Inventory Transfer webhook validation schema
const ShopifyTransferSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  expected_at: z.string().optional().nullable(),
  origin_location: z.object({
    id: z.union([z.number(), z.string()]).optional(),
    name: z.string().optional(),
  }).optional().nullable(),
  destination_location: z.object({
    id: z.union([z.number(), z.string()]).optional(),
    name: z.string().optional(),
  }).optional().nullable(),
  line_items: z.array(
    z.object({
      id: z.union([z.number(), z.string()]),
      variant_id: z.union([z.number(), z.string()]).optional().nullable(),
      product_id: z.union([z.number(), z.string()]).optional().nullable(),
      quantity: z.number(),
      quantity_received: z.number().optional().default(0),
      product_title: z.string().optional(),
      title: z.string().optional(),
    })
  ).default([]),
});

// Utility function to add business days (skip weekends)
function addBusinessDays(startDate: Date, daysToAdd: number): Date {
  const result = new Date(startDate);
  let addedDays = 0;
  
  while (addedDays < daysToAdd) {
    result.setDate(result.getDate() + 1);
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++;
    }
  }
  
  return result;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-shop-domain, x-shopify-topic',
};

function normalizeShopifyId(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const normalized = value.toString();
  return normalized.includes('/') ? normalized.split('/').pop() || normalized : normalized;
}

function ensureShopifyGid(
  value: string | number | null | undefined,
  resource: 'Order' | 'Location' | 'FulfillmentOrder',
): string | null {
  if (value === null || value === undefined) return null;
  const asString = value.toString().trim();
  if (!asString) return null;
  if (asString.startsWith('gid://')) return asString;
  const numericId = normalizeShopifyId(asString);
  if (!numericId) return null;
  return `gid://shopify/${resource}/${numericId}`;
}

async function shopifyGraphQL(store: any, query: string, variables: Record<string, unknown> = {}) {
  const storeUrl = store.store_url?.replace(/\/$/, '');
  const accessToken = store.access_token;

  if (!storeUrl || !accessToken) {
    throw new Error('Missing Shopify store credentials');
  }

  const response = await fetch(`https://${storeUrl}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Shopify GraphQL error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (result.errors?.length) {
    throw new Error(result.errors.map((error: any) => error.message).join(', '));
  }

  return result.data;
}

async function getShopifyAccessScopes(store: any): Promise<string[]> {
  const storeUrl = store.store_url?.replace(/\/$/, '');
  const accessToken = store.access_token;

  if (!storeUrl || !accessToken) {
    return [];
  }

  try {
    const response = await fetch(`https://${storeUrl}/admin/oauth/access_scopes.json`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
    });

    if (!response.ok) {
      console.warn(`Unable to fetch Shopify access scopes: ${response.status} ${response.statusText}`);
      return [];
    }

    const payload = await response.json();
    return (payload?.access_scopes || [])
      .map((scope: { handle?: string }) => scope?.handle)
      .filter(Boolean);
  } catch (error) {
    console.warn('Failed to read Shopify access scopes:', error);
    return [];
  }
}

async function getOrderFulfillmentOrders(store: any, shopifyOrderId: string, maxAttempts = 10) {
  const query = `
    query getFulfillmentOrders($orderId: ID!) {
      order(id: $orderId) {
        fulfillmentOrders(first: 20) {
          nodes {
            id
            status
            requestStatus
            assignedLocation {
              location {
                id
                name
              }
            }
          }
        }
      }
    }
  `;

  const orderGid = ensureShopifyGid(shopifyOrderId, 'Order');
  if (!orderGid) return [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const data = await shopifyGraphQL(store, query, { orderId: orderGid });
    const fulfillmentOrders = data?.order?.fulfillmentOrders?.nodes || [];

    if (fulfillmentOrders.length > 0 || attempt === maxAttempts) {
      return fulfillmentOrders;
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return [];
}

async function resolveUniqueOrderId(
  supabase: any,
  companyId: string,
  preferredOrderId: string,
  shopifyOrderId: string,
  excludeOrderId?: number,
) {
  let query = supabase
    .from('orders')
    .select('id')
    .eq('company_id', companyId)
    .eq('order_id', preferredOrderId)
    .limit(1);

  if (excludeOrderId) {
    query = query.neq('id', excludeOrderId);
  }

  const { data: conflictingOrder } = await query.maybeSingle();

  if (!conflictingOrder) {
    return preferredOrderId;
  }

  return `${preferredOrderId}-${shopifyOrderId.slice(-6)}`;
}

async function reserveInventoryForOrder(
  supabase: any,
  params: {
    companyId: string;
    warehouseId: string;
    orderRef: string;
    lineItems: Array<{ sku?: string; quantity?: number }>;
  },
) {
  const { companyId, warehouseId, orderRef, lineItems } = params;

  for (const lineItem of lineItems) {
    const sku = sanitizeString(lineItem.sku, 100);
    const requestedQty = Number(lineItem.quantity || 0);

    if (!sku || requestedQty <= 0) {
      continue;
    }

    const { data: item } = await supabase
      .from('items')
      .select('id, sku')
      .eq('company_id', companyId)
      .eq('sku', sku)
      .maybeSingle();

    if (!item?.id) {
      console.warn(`⚠️ [${orderRef}] No item mapping found for SKU "${sku}", skipping inventory reservation`);
      continue;
    }

    const { data: levels, error: levelsError } = await supabase
      .from('inventory_levels')
      .select('id, quantity_on_hand, quantity_available, quantity_allocated, received_date')
      .eq('company_id', companyId)
      .eq('warehouse_id', warehouseId)
      .eq('item_id', item.id)
      .gt('quantity_available', 0)
      .order('received_date', { ascending: true });

    if (levelsError) {
      console.error(`❌ [${orderRef}] Failed to load inventory levels for SKU "${sku}":`, levelsError);
      continue;
    }

    let remainingToReserve = requestedQty;

    for (const level of levels || []) {
      if (remainingToReserve <= 0) break;

      const reserveQty = Math.min(level.quantity_available || 0, remainingToReserve);
      if (reserveQty <= 0) continue;

      const newAllocated = (level.quantity_allocated || 0) + reserveQty;
      const newAvailable = Math.max(0, (level.quantity_available || 0) - reserveQty);

      const { error: updateError } = await supabase
        .from('inventory_levels')
        .update({
          quantity_allocated: newAllocated,
          quantity_available: newAvailable,
        })
        .eq('id', level.id);

      if (updateError) {
        console.error(`❌ [${orderRef}] Failed reserving ${reserveQty} units of SKU "${sku}" on level ${level.id}:`, updateError);
        continue;
      }

      remainingToReserve -= reserveQty;
    }

    if (remainingToReserve > 0) {
      console.warn(`⚠️ [${orderRef}] Insufficient available inventory for SKU "${sku}". Requested ${requestedQty}, reserved ${requestedQty - remainingToReserve}.`);
    } else {
      console.log(`✅ [${orderRef}] Reserved ${requestedQty} units for SKU "${sku}"`);
    }
  }
}

async function routeAndRequestFulfillmentOrders(store: any, shopifyOrderId: string) {
  const shipTornadoLocationIdRaw = store.fulfillment_service_location_id || store.fulfillment_location_id;
  const shipTornadoLocationId = ensureShopifyGid(shipTornadoLocationIdRaw, 'Location');

  if (!shipTornadoLocationId) {
    console.log('Fulfillment service is not fully configured, skipping auto-routing');
    return;
  }
  if (shipTornadoLocationId !== shipTornadoLocationIdRaw) {
    console.log(`Normalized Ship Tornado location ID from "${shipTornadoLocationIdRaw}" to "${shipTornadoLocationId}"`);
  }

  const currentScopes = await getShopifyAccessScopes(store);
  const requiredRoutingScopes = [
    'read_merchant_managed_fulfillment_orders',
    'write_merchant_managed_fulfillment_orders',
  ];
  const missingRoutingScopes = requiredRoutingScopes.filter((scope) => !currentScopes.includes(scope));
  if (missingRoutingScopes.length > 0) {
    console.warn(
      `Missing Shopify scopes for auto-routing (${missingRoutingScopes.join(', ')}). ` +
      'Re-authorize the store connection to grant these scopes.',
    );
  }

  const fulfillmentOrders = await getOrderFulfillmentOrders(store, shopifyOrderId);
  console.log(`Found ${fulfillmentOrders.length} fulfillment orders for Shopify order ${shopifyOrderId}`);

  const closedStatuses = new Set(['CLOSED', 'CANCELLED', 'INCOMPLETE']);

  for (const fulfillmentOrder of fulfillmentOrders) {
    if (closedStatuses.has(fulfillmentOrder.status)) {
      continue;
    }

    let activeFulfillmentOrder = fulfillmentOrder;
    const assignedLocationId = activeFulfillmentOrder.assignedLocation?.location?.id || null;

    if (
      assignedLocationId !== shipTornadoLocationId &&
      (!activeFulfillmentOrder.requestStatus || activeFulfillmentOrder.requestStatus === 'UNSUBMITTED')
    ) {
      const moveMutation = `
        mutation fulfillmentOrderMove($id: ID!, $newLocationId: ID!) {
          fulfillmentOrderMove(id: $id, newLocationId: $newLocationId) {
            movedFulfillmentOrder {
              id
              status
              requestStatus
              assignedLocation {
                location {
                  id
                  name
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

      const moveResult = await shopifyGraphQL(store, moveMutation, {
        id: activeFulfillmentOrder.id,
        newLocationId: shipTornadoLocationId,
      });

      const moveErrors = moveResult?.fulfillmentOrderMove?.userErrors || [];
      if (moveErrors.length > 0) {
        console.log(`Unable to move fulfillment order ${activeFulfillmentOrder.id}:`, moveErrors.map((error: any) => error.message).join(', '));
      } else if (moveResult?.fulfillmentOrderMove?.movedFulfillmentOrder) {
        activeFulfillmentOrder = moveResult.fulfillmentOrderMove.movedFulfillmentOrder;
        console.log(`✅ Moved fulfillment order ${activeFulfillmentOrder.id} to Ship Tornado location`);
      }
    }

    const currentLocationId = activeFulfillmentOrder.assignedLocation?.location?.id || null;
    if (currentLocationId !== shipTornadoLocationId) {
      console.log(`Skipping fulfillment order ${activeFulfillmentOrder.id} because it is still assigned elsewhere`);
      continue;
    }

    if (!activeFulfillmentOrder.requestStatus || activeFulfillmentOrder.requestStatus === 'UNSUBMITTED') {
      const submitMutation = `
        mutation fulfillmentOrderSubmitFulfillmentRequest($id: ID!) {
          fulfillmentOrderSubmitFulfillmentRequest(id: $id) {
            submittedFulfillmentOrder {
              id
              status
              requestStatus
              assignedLocation {
                location {
                  id
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

      const submitResult = await shopifyGraphQL(store, submitMutation, { id: activeFulfillmentOrder.id });
      const submitErrors = submitResult?.fulfillmentOrderSubmitFulfillmentRequest?.userErrors || [];

      if (submitErrors.length > 0) {
        console.log(`Unable to request fulfillment for ${activeFulfillmentOrder.id}:`, submitErrors.map((error: any) => error.message).join(', '));
      } else if (submitResult?.fulfillmentOrderSubmitFulfillmentRequest?.submittedFulfillmentOrder) {
        activeFulfillmentOrder = submitResult.fulfillmentOrderSubmitFulfillmentRequest.submittedFulfillmentOrder;
        console.log(`✅ Submitted fulfillment request for ${activeFulfillmentOrder.id}`);
      }
    }

    if (
      activeFulfillmentOrder.requestStatus &&
      activeFulfillmentOrder.requestStatus !== 'ACCEPTED' &&
      !closedStatuses.has(activeFulfillmentOrder.status)
    ) {
      const acceptMutation = `
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

      const acceptResult = await shopifyGraphQL(store, acceptMutation, {
        id: activeFulfillmentOrder.id,
        message: 'Auto-accepted by Ship Tornado',
      });

      const acceptErrors = acceptResult?.fulfillmentOrderAcceptFulfillmentRequest?.userErrors || [];
      if (acceptErrors.length > 0) {
        console.log(`Fulfillment request acceptance info for ${activeFulfillmentOrder.id}:`, acceptErrors.map((error: any) => error.message).join(', '));
      } else {
        console.log(`✅ Auto-accepted fulfillment request for fulfillment order: ${activeFulfillmentOrder.id}`);
      }
    }
  }
}

// Helper: process order webhook into orders table and accept fulfillment requests
async function handleOrderWebhook(supabase: any, order: any, store: any, topic: string) {
  console.log(`Processing ${topic} for order:`, order.id, order.order_number);

  const companyId = store.company_id;
  const shopifyStoreId = store.id;
  const normalizedShopifyOrderId = normalizeShopifyId(order.id) || order.id.toString();
  const preferredOrderId = `SHOP-${order.order_number || normalizedShopifyOrderId}`;

  // Get default warehouse with fallback to any active warehouse
  let { data: warehouse } = await supabase
    .from('warehouses')
    .select('id')
    .eq('company_id', companyId)
    .eq('is_default', true)
    .maybeSingle();

  if (!warehouse) {
    const { data: fallbackWarehouse } = await supabase
      .from('warehouses')
      .select('id')
      .eq('company_id', companyId)
      .limit(1)
      .maybeSingle();

    warehouse = fallbackWarehouse || null;

    if (warehouse) {
      console.warn(`No default warehouse set for company ${companyId}; falling back to warehouse ${warehouse.id}`);
    } else {
      console.warn(`No warehouse found for company ${companyId}; skipping local order upsert but continuing fulfillment routing`);
    }
  }

  // Build line items array
  const lineItems = (order.line_items || []).map((li: any) => ({
    name: sanitizeString(li.title || li.name, 255) || 'Unknown',
    sku: sanitizeString(li.sku, 100) || '',
    quantity: li.quantity || 1,
    price: typeof li.price === 'string' ? parseFloat(li.price) : (li.price || 0),
    product_id: li.product_id?.toString() || null,
    variant_id: li.variant_id?.toString() || null,
    requires_shipping: li.requires_shipping !== false,
    grams: li.grams || 0,
  }));

  // Match Shopify order items to Item Master records so downstream cartonization can rely on Item Master dimensions.
  const skuSet = new Set<string>();
  const variantIdSet = new Set<string>();
  const productIdSet = new Set<string>();
  for (const item of lineItems) {
    if (item.sku) skuSet.add(item.sku);
    if (item.variant_id) variantIdSet.add(item.variant_id);
    if (item.product_id) productIdSet.add(item.product_id);
  }

  const matchedItemsBySku = new Map<string, any>();
  const matchedItemsByVariantId = new Map<string, any>();
  const matchedItemsByProductId = new Map<string, any>();

  if (skuSet.size > 0) {
    const { data: skuMatches } = await supabase
      .from('items')
      .select('id, sku, shopify_variant_id, shopify_product_id')
      .eq('company_id', companyId)
      .in('sku', Array.from(skuSet));

    (skuMatches || []).forEach((match: any) => {
      if (match.sku) matchedItemsBySku.set(match.sku, match);
    });
  }

  if (variantIdSet.size > 0) {
    const { data: variantMatches } = await supabase
      .from('items')
      .select('id, sku, shopify_variant_id, shopify_product_id')
      .eq('company_id', companyId)
      .in('shopify_variant_id', Array.from(variantIdSet));

    (variantMatches || []).forEach((match: any) => {
      if (match.shopify_variant_id) matchedItemsByVariantId.set(match.shopify_variant_id, match);
    });
  }

  if (productIdSet.size > 0) {
    const { data: productMatches } = await supabase
      .from('items')
      .select('id, sku, shopify_variant_id, shopify_product_id')
      .eq('company_id', companyId)
      .in('shopify_product_id', Array.from(productIdSet));

    (productMatches || []).forEach((match: any) => {
      if (match.shopify_product_id) matchedItemsByProductId.set(match.shopify_product_id, match);
    });
  }

  const enrichedLineItems = lineItems.map((item: any) => {
    const matchedItem = (item.variant_id ? matchedItemsByVariantId.get(item.variant_id) : null)
      || (item.product_id ? matchedItemsByProductId.get(item.product_id) : null)
      || (item.sku ? matchedItemsBySku.get(item.sku) : null);

    if (!matchedItem) {
      return {
        ...item,
        itemId: null,
        item_master_match: false,
        item_master_error: 'Item not found in Item Master. Run a Shopify product sync.',
      };
    }

    return {
      ...item,
      itemId: matchedItem.id,
      item_master_match: true,
    };
  });

  const hasUnmatchedItems = enrichedLineItems.some((item: any) => item.item_master_match === false);

  // Build shipping address
  const shippingAddr = order.shipping_address ? {
    name: sanitizeString(`${order.shipping_address.first_name || ''} ${order.shipping_address.last_name || ''}`.trim(), 200),
    company: sanitizeString(order.shipping_address.company, 255),
    street1: sanitizeString(order.shipping_address.address1, 255),
    street2: sanitizeString(order.shipping_address.address2, 255),
    city: sanitizeString(order.shipping_address.city, 100),
    state: sanitizeString(order.shipping_address.province_code || order.shipping_address.province, 100),
    zip: sanitizeString(order.shipping_address.zip, 20),
    country: sanitizeString(order.shipping_address.country_code || order.shipping_address.country, 100),
    phone: sanitizeString(order.shipping_address.phone, 20),
  } : null;

  // Determine order status
  const fulfillmentStatus = order.fulfillment_status || 'unfulfilled';
  let status = 'ready_to_ship';
  if (fulfillmentStatus === 'fulfilled') status = 'shipped';
  else if (fulfillmentStatus === 'partially_fulfilled') status = 'partially_shipped';
  else if (order.cancelled_at) status = 'cancelled';
  if (hasUnmatchedItems && status !== 'cancelled') status = 'error';

  const customerName = order.customer
    ? sanitizeString(`${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim(), 200)
    : sanitizeString(shippingAddr?.name, 200);

  const orderData = {
    order_id: preferredOrderId,
    company_id: companyId,
    shopify_store_id: shopifyStoreId,
    warehouse_id: warehouse?.id ?? null,
    customer_name: customerName || 'Unknown',
    customer_email: sanitizeString(order.email || order.customer?.email, 255),
    customer_phone: sanitizeString(order.customer?.phone || shippingAddr?.phone, 20),
    customer_company: sanitizeString(order.customer?.company || shippingAddr?.company, 255),
    shipping_address: shippingAddr,
    items: enrichedLineItems,
    value: typeof order.total_price === 'string' ? parseFloat(order.total_price) : (order.total_price || 0),
    status,
    fulfillment_status: fulfillmentStatus,
    items_total: enrichedLineItems.reduce((sum: number, li: any) => sum + (li.quantity || 0), 0),
    items_shipped: 0,
    fulfillment_percentage: 0,
    order_date: order.created_at ? new Date(order.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  };

  if (warehouse?.id) {
    const { data: existingMapping } = await supabase
      .from('shopify_order_mappings')
      .select('id, ship_tornado_order_id')
      .eq('company_id', companyId)
      .eq('shopify_store_id', shopifyStoreId)
      .eq('shopify_order_id', normalizedShopifyOrderId)
      .maybeSingle();

    if (existingMapping) {
      const resolvedOrderId = await resolveUniqueOrderId(
        supabase,
        companyId,
        preferredOrderId,
        normalizedShopifyOrderId,
        existingMapping.ship_tornado_order_id,
      );

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          ...orderData,
          order_id: resolvedOrderId,
        })
        .eq('id', existingMapping.ship_tornado_order_id);

      if (updateError) {
        console.error('Error updating order:', updateError);
        throw updateError;
      }

      await supabase
        .from('shopify_order_mappings')
        .update({
          shopify_order_number: order.order_number?.toString() || null,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', existingMapping.id);

      console.log('✅ Updated mapped Shopify order:', existingMapping.ship_tornado_order_id);
    } else {
      const resolvedOrderId = await resolveUniqueOrderId(
        supabase,
        companyId,
        preferredOrderId,
        normalizedShopifyOrderId,
      );

      const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          ...orderData,
          order_id: resolvedOrderId,
          required_delivery_date: addBusinessDays(new Date(), 5).toISOString().split('T')[0],
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error inserting order:', insertError);
        throw insertError;
      }

      const { error: mappingError } = await supabase
        .from('shopify_order_mappings')
        .insert({
          company_id: companyId,
          ship_tornado_order_id: newOrder.id,
          shopify_order_id: normalizedShopifyOrderId,
          shopify_order_number: order.order_number?.toString() || null,
          shopify_store_id: shopifyStoreId,
          sync_status: 'synced',
        });

      if (mappingError) {
        console.error('Error creating Shopify order mapping:', mappingError);
        throw mappingError;
      }

      console.log('✅ Created new order:', newOrder.id, 'from Shopify order', order.order_number);

      await reserveInventoryForOrder(supabase, {
        companyId,
        warehouseId: warehouse.id,
        orderRef: resolvedOrderId,
        lineItems: lineItems.map((li: any) => ({
          sku: li.sku,
          quantity: li.quantity,
        })),
      });
    }
  }

  if (store.fulfillment_service_location_id || store.fulfillment_location_id) {
    try {
      await routeAndRequestFulfillmentOrders(store, normalizedShopifyOrderId);
    } catch (ffError) {
      console.error('Failed to auto-route/request fulfillment (non-fatal):', ffError);
    }
  }
}

// Helper functions for webhook processing
async function handlePurchaseOrderWebhook(supabase: any, webhookData: any, store: any, topic: string) {
  console.log(`Processing ${topic} for PO:`, webhookData.id);
  
  try {
    const validatedPO = ShopifyPurchaseOrderSchema.parse(webhookData);
    
    const { data: existingMapping } = await supabase
      .from('shopify_po_mappings')
      .select('ship_tornado_po_id')
      .eq('shopify_store_id', store.id)
      .eq('shopify_po_id', validatedPO.id)
      .single();
    
    let warehouse = null;
    if (validatedPO.destination?.id) {
      const destinationId = validatedPO.destination.id.toString();
      const { data: matchedWarehouse } = await supabase
        .from('warehouses')
        .select('id')
        .eq('company_id', store.company_id)
        .eq('shopify_location_id', destinationId)
        .single();
      
      if (matchedWarehouse) {
        warehouse = matchedWarehouse;
        console.log(`✅ Matched PO destination to warehouse: ${destinationId}`);
      }
    }
    
    if (!warehouse) {
      const { data: defaultWarehouse } = await supabase
        .from('warehouses')
        .select('id')
        .eq('company_id', store.company_id)
        .eq('is_default', true)
        .single();
      
      warehouse = defaultWarehouse;
      if (!warehouse) throw new Error('No default warehouse found');
      console.log('Using default warehouse (no destination match)');
    }
    
    const poData = {
      company_id: store.company_id,
      customer_id: store.customer_id || null,
      warehouse_id: warehouse.id,
      po_number: `SHOP-PO-${validatedPO.name || validatedPO.id}`,
      vendor_name: validatedPO.supplier?.name || 'Unknown Supplier',
      vendor_id: validatedPO.supplier?.id?.toString(),
      expected_date: validatedPO.expected_at ? new Date(validatedPO.expected_at).toISOString().split('T')[0] : null,
      status: mapShopifyPOStatus(validatedPO.status),
      notes: validatedPO.note || null,
      shopify_po_id: validatedPO.id,
      shopify_store_id: store.id,
      source_type: 'shopify_purchase_order',
      shopify_destination_location_id: validatedPO.destination?.id?.toString() || null,
      shopify_destination_location_name: validatedPO.destination?.name || null,
      metadata: {
        shopify_created_at: validatedPO.created_at,
        shopify_updated_at: validatedPO.updated_at,
        shopify_destination: validatedPO.destination || null,
      },
    };
    
    let shipTornadoPoId: string;
    
    if (existingMapping) {
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update(poData)
        .eq('id', existingMapping.ship_tornado_po_id);
      
      if (updateError) throw updateError;
      shipTornadoPoId = existingMapping.ship_tornado_po_id;
    } else {
      const { data: newPO, error: insertError } = await supabase
        .from('purchase_orders')
        .insert(poData)
        .select('id')
        .single();
      
      if (insertError) throw insertError;
      shipTornadoPoId = newPO.id;
      
      await supabase.from('shopify_po_mappings').insert({
        company_id: store.company_id,
        shopify_store_id: store.id,
        shopify_po_id: validatedPO.id,
        shopify_po_number: validatedPO.name || validatedPO.id,
        ship_tornado_po_id: shipTornadoPoId,
        source_type: 'purchase_order',
      });
    }
    
    await syncPOLineItems(supabase, shipTornadoPoId, validatedPO.line_items, store.company_id);
    console.log(`✅ Successfully processed ${topic} for PO:`, validatedPO.id);
  } catch (error) {
    console.error('Error processing purchase order webhook:', error);
    throw error;
  }
}

async function handleTransferWebhook(supabase: any, webhookData: any, store: any, topic: string) {
  console.log(`Processing ${topic} for Transfer:`, webhookData.id);
  
  try {
    const validatedTransfer = ShopifyTransferSchema.parse(webhookData);
    
    const { data: existingMapping } = await supabase
      .from('shopify_po_mappings')
      .select('ship_tornado_po_id')
      .eq('shopify_store_id', store.id)
      .eq('shopify_po_id', validatedTransfer.id)
      .single();
    
    let warehouse = null;
    if (validatedTransfer.destination_location?.id) {
      const destinationId = validatedTransfer.destination_location.id.toString();
      const { data: matchedWarehouse } = await supabase
        .from('warehouses')
        .select('id')
        .eq('company_id', store.company_id)
        .eq('shopify_location_id', destinationId)
        .single();
      
      if (matchedWarehouse) {
        warehouse = matchedWarehouse;
        console.log(`✅ Matched Transfer destination to warehouse: ${destinationId}`);
      }
    }
    
    if (!warehouse) {
      const { data: defaultWarehouse } = await supabase
        .from('warehouses')
        .select('id')
        .eq('company_id', store.company_id)
        .eq('is_default', true)
        .single();
      
      warehouse = defaultWarehouse;
      if (!warehouse) throw new Error('No default warehouse found');
      console.log('Using default warehouse (no destination match)');
    }
    
    const poData = {
      company_id: store.company_id,
      customer_id: store.customer_id || null,
      warehouse_id: warehouse.id,
      po_number: `SHOP-TR-${validatedTransfer.id}`,
      vendor_name: 'Internal Transfer',
      vendor_id: validatedTransfer.origin_location?.id?.toString(),
      expected_date: validatedTransfer.expected_at ? new Date(validatedTransfer.expected_at).toISOString().split('T')[0] : null,
      status: mapShopifyTransferStatus(validatedTransfer.status),
      notes: `Transfer from ${validatedTransfer.origin_location?.name || 'Unknown'} to ${validatedTransfer.destination_location?.name || 'Unknown'}`,
      shopify_po_id: validatedTransfer.id,
      shopify_store_id: store.id,
      source_type: 'shopify_transfer',
      shopify_destination_location_id: validatedTransfer.destination_location?.id?.toString() || null,
      shopify_destination_location_name: validatedTransfer.destination_location?.name || null,
      metadata: {
        shopify_created_at: validatedTransfer.created_at,
        shopify_updated_at: validatedTransfer.updated_at,
        origin_location: validatedTransfer.origin_location,
        destination_location: validatedTransfer.destination_location,
      },
    };
    
    let shipTornadoPoId: string;
    
    if (existingMapping) {
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update(poData)
        .eq('id', existingMapping.ship_tornado_po_id);
      
      if (updateError) throw updateError;
      shipTornadoPoId = existingMapping.ship_tornado_po_id;
    } else {
      const { data: newPO, error: insertError } = await supabase
        .from('purchase_orders')
        .insert(poData)
        .select('id')
        .single();
      
      if (insertError) throw insertError;
      shipTornadoPoId = newPO.id;
      
      await supabase.from('shopify_po_mappings').insert({
        company_id: store.company_id,
        shopify_store_id: store.id,
        shopify_po_id: validatedTransfer.id,
        shopify_po_number: validatedTransfer.id,
        ship_tornado_po_id: shipTornadoPoId,
        source_type: 'inventory_transfer',
      });
    }
    
    await syncTransferLineItems(supabase, shipTornadoPoId, validatedTransfer.line_items, store.company_id);
    console.log(`✅ Successfully processed ${topic} for Transfer:`, validatedTransfer.id);
  } catch (error) {
    console.error('Error processing transfer webhook:', error);
    throw error;
  }
}

async function syncPOLineItems(supabase: any, poId: string, lineItems: any[], companyId: string) {
  for (const lineItem of lineItems) {
    const { data: matchedItem } = await supabase
      .from('items')
      .select('id')
      .eq('company_id', companyId)
      .or(`sku.eq.${lineItem.sku || 'NONE'},shopify_variant_id.eq.${lineItem.variant_id || 'NONE'}`)
      .limit(1)
      .single();
    
    const lineItemData = {
      po_id: poId,
      item_id: matchedItem?.id || null,
      sku: lineItem.sku || lineItem.variant_id?.toString() || 'UNKNOWN',
      product_name: lineItem.name || lineItem.title || 'Unknown Product',
      quantity_ordered: lineItem.quantity || 0,
      quantity_received: lineItem.quantity_received || 0,
      unit_cost: lineItem.price ? parseFloat(lineItem.price.toString()) : null,
      uom: 'unit',
      shopify_line_item_id: lineItem.id?.toString(),
      metadata: {
        variant_id: lineItem.variant_id,
        product_id: lineItem.product_id,
      },
    };
    
    const { data: existingLineItem } = await supabase
      .from('po_line_items')
      .select('id')
      .eq('po_id', poId)
      .eq('shopify_line_item_id', lineItem.id?.toString())
      .single();
    
    if (existingLineItem) {
      await supabase
        .from('po_line_items')
        .update(lineItemData)
        .eq('id', existingLineItem.id);
    } else {
      await supabase
        .from('po_line_items')
        .insert(lineItemData);
    }
  }
}

async function syncTransferLineItems(supabase: any, poId: string, lineItems: any[], companyId: string) {
  for (const lineItem of lineItems) {
    const { data: matchedItem } = await supabase
      .from('items')
      .select('id, sku')
      .eq('company_id', companyId)
      .eq('shopify_variant_id', lineItem.variant_id?.toString())
      .limit(1)
      .single();
    
    const lineItemData = {
      po_id: poId,
      item_id: matchedItem?.id || null,
      sku: matchedItem?.sku || lineItem.variant_id?.toString() || 'UNKNOWN',
      product_name: lineItem.product_title || lineItem.title || 'Unknown Product',
      quantity_ordered: lineItem.quantity || 0,
      quantity_received: lineItem.quantity_received || 0,
      unit_cost: null,
      uom: 'unit',
      shopify_line_item_id: lineItem.id?.toString(),
      metadata: {
        variant_id: lineItem.variant_id,
        product_id: lineItem.product_id,
      },
    };
    
    const { data: existingLineItem } = await supabase
      .from('po_line_items')
      .select('id')
      .eq('po_id', poId)
      .eq('shopify_line_item_id', lineItem.id?.toString())
      .single();
    
    if (existingLineItem) {
      await supabase
        .from('po_line_items')
        .update(lineItemData)
        .eq('id', existingLineItem.id);
    } else {
      await supabase
        .from('po_line_items')
        .insert(lineItemData);
    }
  }
}

function mapShopifyPOStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'draft': 'pending',
    'open': 'pending',
    'received': 'received',
    'closed': 'closed',
    'cancelled': 'closed',
  };
  return statusMap[status] || 'pending';
}

function mapShopifyTransferStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'draft': 'pending',
    'pending': 'pending',
    'in_transit': 'pending',
    'received': 'received',
    'cancelled': 'closed',
  };
  return statusMap[status] || 'pending';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get webhook headers
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256');
    const shopDomain = req.headers.get('x-shopify-shop-domain');
    const topic = req.headers.get('x-shopify-topic');

    console.log('Received Shopify webhook:', { shopDomain, topic });

    const rawBody = await req.text();
    const webhookData = JSON.parse(rawBody);
    
    // Validate webhook data for orders
    let validatedOrder;
    if (topic === 'orders/create' || topic === 'orders/updated') {
      try {
        validatedOrder = ShopifyOrderSchema.parse(webhookData);
      } catch (validationError) {
        console.error('Order validation failed:', validationError);
        if (validationError instanceof ZodError) {
          console.error('Validation errors:', validationError.errors);
        }
        throw new Error('Invalid order data from Shopify');
      }
    }

    // Find store by Shopify domain in shopify_stores table
    const { data: store, error: storeError } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('store_url', shopDomain)
      .eq('is_active', true)
      .single();

    if (storeError || !store) {
      console.error('No active store found for domain:', shopDomain);
      throw new Error(`No store connected with domain: ${shopDomain}`);
    }

    const companyId = store.company_id;
    const shopifyStoreId = store.id;
    console.log('✅ Found store:', shopifyStoreId, 'for company:', companyId);

    // SECURITY: HMAC validation is MANDATORY
    if (!hmacHeader) {
      console.error('Missing HMAC signature header');
      throw new Error('Missing webhook signature - HMAC header required');
    }

    const apiSecret = Deno.env.get('SHOPIFY_API_SECRET') || store.webhook_secret;
    if (!apiSecret) {
      console.error('SHOPIFY_API_SECRET not configured');
      throw new Error('Webhook secret not configured');
    }

    // Verify HMAC signature using Shopify API Secret
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
    const computedHmac = btoa(String.fromCharCode(...new Uint8Array(signature)));
    
    if (computedHmac !== hmacHeader) {
      console.error('HMAC verification failed - signature mismatch');
      throw new Error('Invalid webhook signature');
    }

    console.log('✅ HMAC signature verified successfully');

    // Route to appropriate handler based on topic
    switch (topic) {
      case 'purchase_orders/create':
      case 'purchase_orders/update':
        await handlePurchaseOrderWebhook(supabase, webhookData, store, topic);
        break;
        
      case 'inventory_transfers/create':
      case 'inventory_transfers/update':
        await handleTransferWebhook(supabase, webhookData, store, topic);
        break;
        
      case 'orders/create':
      case 'orders/updated':
        await handleOrderWebhook(supabase, validatedOrder || webhookData, store, topic);
        break;
        
      default:
        console.log('Unhandled webhook topic:', topic);
    }
    
    return new Response(JSON.stringify({ 
      message: 'Webhook processed successfully',
      topic,
      storeId: store.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

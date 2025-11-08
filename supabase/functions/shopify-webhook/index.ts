import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z, ZodError } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { shopifyGraphQL } from '../_shared/shopify-item-matcher.ts';

// Sanitization helper to prevent injection attacks
function sanitizeString(str: string | null | undefined, maxLength: number = 255): string | null {
  if (!str) return null;
  return str.trim().slice(0, maxLength);
}

// Shopify webhook order validation schema
const ShopifyOrderSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  admin_graphql_api_id: z.string().optional().nullable(),
  order_number: z.union([z.number(), z.string()]).transform(String),
  email: z.string().email().max(255).optional().nullable(),
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

async function autoRequestFulfillment(
  supabase: any,
  store: any,
  order: ShopifyOrder,
  topic: string
) {
  const locationId =
    store.fulfillment_service_location_id ||
    store.settings?.fulfillment_service?.location_id ||
    null;

  if (!locationId) {
    console.log('⚠️  Skipping auto-fulfillment request - no fulfillment location configured for store', store.id);
    await supabase.from('shopify_sync_logs').insert({
      company_id: store.company_id,
      shopify_store_id: store.id,
      sync_type: 'fulfillment_request_auto',
      direction: 'outbound',
      status: 'skipped',
      shopify_order_id: order.id,
      metadata: { reason: 'missing_location', topic },
    });
    return;
  }

  const orderGid = order.admin_graphql_api_id || (order.id ? `gid://shopify/Order/${order.id}` : null);

  if (!orderGid) {
    console.log('⚠️  Skipping auto-fulfillment request - unable to determine order GID');
    await supabase.from('shopify_sync_logs').insert({
      company_id: store.company_id,
      shopify_store_id: store.id,
      sync_type: 'fulfillment_request_auto',
      direction: 'outbound',
      status: 'skipped',
      shopify_order_id: order.id,
      metadata: { reason: 'missing_order_gid', topic },
    });
    return;
  }

  const shopifySettings = {
    store_url: store.store_url,
    access_token: store.access_token,
  };

  const actions: Array<Record<string, unknown>> = [];

  try {
    const fulfillmentQuery = `
      query ($id: ID!) {
        order(id: $id) {
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
              supportedActions {
                action
              }
            }
          }
        }
      }
    `;

    const fulfillmentResult = await shopifyGraphQL(shopifySettings, fulfillmentQuery, { id: orderGid });
    const fulfillmentNodes =
      fulfillmentResult.data?.order?.fulfillmentOrders?.nodes ?? [];

    if (fulfillmentNodes.length === 0) {
      actions.push({ status: 'skipped', reason: 'no_fulfillment_orders' });
    }

    for (const node of fulfillmentNodes) {
      const assignedLocationId = node.assignedLocation?.location?.id;
      const foId: string = node.id;

      if (assignedLocationId !== locationId) {
        actions.push({ id: foId, status: 'skipped', reason: 'location_mismatch' });
        continue;
      }

      if (node.requestStatus && node.requestStatus !== 'UNSUBMITTED') {
        actions.push({
          id: foId,
          status: 'skipped',
          reason: `already_${node.requestStatus.toLowerCase()}`,
        });
        continue;
      }

      const supportsRequest = Array.isArray(node.supportedActions)
        ? node.supportedActions.some((action: any) => action.action === 'REQUEST_FULFILLMENT')
        : false;

      if (!supportsRequest) {
        actions.push({ id: foId, status: 'skipped', reason: 'request_not_supported' });
        continue;
      }

      const requestMutation = `
        mutation ($id: ID!, $message: String) {
          fulfillmentOrderSubmitFulfillmentRequest(id: $id, message: $message) {
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

      try {
        const mutationResult = await shopifyGraphQL(shopifySettings, requestMutation, {
          id: foId,
          message: `Auto-requested by Ship Tornado (${topic})`,
        });

        const mutationData = mutationResult.data?.fulfillmentOrderSubmitFulfillmentRequest;
        const userErrors = mutationData?.userErrors ?? [];

        if (userErrors.length > 0) {
          actions.push({ id: foId, status: 'error', reason: 'user_errors', details: userErrors });
          continue;
        }

        actions.push({
          id: foId,
          status: 'success',
          previousRequestStatus: node.requestStatus,
          newRequestStatus: mutationData?.fulfillmentOrder?.requestStatus,
          newStatus: mutationData?.fulfillmentOrder?.status,
        });
      } catch (mutationError: any) {
        console.error('Failed to submit fulfillment request:', mutationError);
        actions.push({ id: foId, status: 'error', reason: 'mutation_failed', message: mutationError.message });
      }
    }

    const allSkipped = actions.length > 0 && actions.every(action => action.status === 'skipped');
    const hasError = actions.some(action => action.status === 'error');
    const logStatus = allSkipped ? 'skipped' : hasError ? 'error' : 'success';

    await supabase.from('shopify_sync_logs').insert({
      company_id: store.company_id,
      shopify_store_id: store.id,
      sync_type: 'fulfillment_request_auto',
      direction: 'outbound',
      status: logStatus,
      shopify_order_id: order.id,
      metadata: {
        topic,
        locationId,
        orderGid,
        actions,
      },
    });
  } catch (error: any) {
    console.error('❌ Auto fulfillment request failed:', error);
    await supabase.from('shopify_sync_logs').insert({
      company_id: store.company_id,
      shopify_store_id: store.id,
      sync_type: 'fulfillment_request_auto',
      direction: 'outbound',
      status: 'error',
      shopify_order_id: order.id,
      error_message: error.message,
      metadata: {
        topic,
        locationId,
        orderGid,
      },
    });
  }
}

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

    // Automatically request fulfillment when receiving relevant order webhooks
    if (
      validatedOrder &&
      topic &&
      (topic === 'orders/create' || topic === 'orders/updated')
    ) {
      await autoRequestFulfillment(supabase, store, validatedOrder, topic);
    }

    // NOTE: orders/create webhook removed - orders now sync on fulfillment request only
    // See shopify-fulfillment-order-notification function for order creation logic

    return new Response(JSON.stringify({ message: 'Webhook received' }), {
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

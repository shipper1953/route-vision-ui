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
  email: z.string().email().max(255).optional().nullable(),
  financial_status: z.string().max(50).optional(),
  fulfillment_status: z.string().max(50).optional().nullable(),
  total_price: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) : val
  ),
  currency: z.string().max(3).optional(),
  created_at: z.string().optional(),
  cancel_reason: z.string().max(255).optional().nullable(),
  cancelled_at: z.string().optional().nullable(),
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
    if (topic === 'orders/create' || topic === 'orders/updated' || topic === 'orders/cancelled') {
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

    if (topic === 'orders/cancelled' && validatedOrder) {
      const shopifyOrderId = webhookData.id ? String(webhookData.id) : validatedOrder.id;
      const shopifyOrderNumber = validatedOrder.order_number;
      const cancellationReason = sanitizeString(
        (webhookData.cancel_reason || validatedOrder.cancel_reason) ?? null,
        255
      );
      const cancelledAt = webhookData.cancelled_at || validatedOrder.cancelled_at || new Date().toISOString();

      console.log('🛑 Processing Shopify order cancellation', {
        shopifyOrderId,
        shopifyOrderNumber,
        cancellationReason,
      });

      const { data: mapping } = await supabase
        .from('shopify_order_mappings')
        .select('ship_tornado_order_id')
        .eq('company_id', companyId)
        .eq('shopify_order_id', shopifyOrderId)
        .maybeSingle();

      let shipTornadoOrderId = mapping?.ship_tornado_order_id as number | null | undefined;

      if (!shipTornadoOrderId) {
        const { data: fallbackOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('company_id', companyId)
          .eq('order_id', `SHOP-${shopifyOrderNumber}`)
          .maybeSingle();

        shipTornadoOrderId = fallbackOrder?.id ?? null;
      }

      let logStatus: 'success' | 'warning' | 'error' = shipTornadoOrderId ? 'success' : 'warning';
      let errorMessage: string | null = shipTornadoOrderId
        ? null
        : 'No Ship Tornado order found for Shopify cancellation';

      if (shipTornadoOrderId) {
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', shipTornadoOrderId);

        if (orderUpdateError) {
          console.error('Failed to update order status for cancellation:', orderUpdateError);
          logStatus = 'error';
          errorMessage = `Failed to update order status: ${orderUpdateError.message}`;
        }

        const { error: mappingUpdateError } = await supabase
          .from('shopify_order_mappings')
          .update({ sync_status: 'cancelled' })
          .eq('company_id', companyId)
          .eq('ship_tornado_order_id', shipTornadoOrderId);

        if (mappingUpdateError) {
          console.error('Failed to update Shopify order mapping status:', mappingUpdateError);
          logStatus = 'error';
          errorMessage = `Failed to update order mapping: ${mappingUpdateError.message}`;
        }
      }

      const { data: fulfillmentOrderRecord } = await supabase
        .from('shopify_fulfillment_orders')
        .select('id, metadata, fulfillment_order_id')
        .eq('company_id', companyId)
        .eq('shopify_order_id', shopifyOrderId)
        .maybeSingle();

      let fulfillmentOrderId: string | null = null;

      if (fulfillmentOrderRecord) {
        fulfillmentOrderId = fulfillmentOrderRecord.fulfillment_order_id;
        const updatedMetadata = {
          ...(fulfillmentOrderRecord.metadata || {}),
          cancellation_reason: cancellationReason,
          cancellation_source: 'orders/cancelled_webhook',
          cancellation_received_at: cancelledAt,
          cancellation_processed_at: new Date().toISOString(),
        };

        const { error: fulfillmentUpdateError } = await supabase
          .from('shopify_fulfillment_orders')
          .update({
            status: 'cancelled',
            request_status: 'cancellation_received',
            metadata: updatedMetadata,
          })
          .eq('id', fulfillmentOrderRecord.id);

        if (fulfillmentUpdateError) {
          console.error('Failed to update fulfillment order cancellation status:', fulfillmentUpdateError);
          logStatus = 'error';
          errorMessage = `Failed to update fulfillment order: ${fulfillmentUpdateError.message}`;
        }
      }

      await supabase.from('shopify_sync_logs').insert({
        company_id: companyId,
        sync_type: 'order_cancellation',
        direction: 'inbound',
        status: logStatus,
        shopify_order_id: shopifyOrderId,
        ship_tornado_order_id: shipTornadoOrderId ?? null,
        error_message: errorMessage,
        metadata: {
          cancellation_reason: cancellationReason,
          cancelled_at: cancelledAt,
          shopify_order_number: shopifyOrderNumber,
          fulfillment_order_id: fulfillmentOrderId,
        },
      });

      return new Response(JSON.stringify({ message: 'Order cancellation processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
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

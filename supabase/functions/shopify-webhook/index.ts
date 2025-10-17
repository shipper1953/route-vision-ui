import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { ShopifyOrderSchema, sanitizeString } from './validation.ts';
import { ZodError } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

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

    // Find company by shop domain
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('id, settings')
      .ilike('settings->shopify->>store_url', `%${shopDomain}%`);

    if (companyError || !companies || companies.length === 0) {
      console.error('Company not found for shop:', shopDomain);
      throw new Error('Company not found');
    }

    const company = companies[0];
    const shopifySettings = company.settings?.shopify;

    // SECURITY: HMAC validation is MANDATORY
    if (!hmacHeader) {
      console.error('Missing HMAC signature header');
      throw new Error('Missing webhook signature - HMAC header required');
    }

    if (!shopifySettings?.webhook_secret) {
      console.error('Webhook secret not configured for company:', company.id);
      throw new Error('Webhook secret not configured');
    }

    // Verify HMAC signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(shopifySettings.webhook_secret),
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

    // Handle orders/create webhook
    if (topic === 'orders/create') {
      const shopifyOrder = webhookData;
      
      // Check if order already exists
      const { data: existingMapping } = await supabase
        .from('shopify_order_mappings')
        .select('id')
        .eq('company_id', company.id)
        .eq('shopify_order_id', shopifyOrder.id.toString())
        .single();

      if (existingMapping) {
        console.log('Order already synced:', shopifyOrder.id);
        return new Response(JSON.stringify({ message: 'Order already synced' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Get default warehouse for company
      const { data: warehouse } = await supabase
        .from('warehouses')
        .select('id')
        .eq('company_id', company.id)
        .eq('is_default', true)
        .single();

      // Transform Shopify order to Ship Tornado format with sanitization
      const orderData = {
        order_id: sanitizeString(`SHOP-${shopifyOrder.order_number}`, 50) || 'UNKNOWN',
        customer_name: sanitizeString(
          `${shopifyOrder.customer?.first_name || ''} ${shopifyOrder.customer?.last_name || ''}`.trim(),
          255
        ) || 'Unknown',
        customer_email: sanitizeString(shopifyOrder.customer?.email, 255),
        customer_phone: sanitizeString(shopifyOrder.customer?.phone, 20),
        customer_company: sanitizeString(shopifyOrder.customer?.company, 255),
        shipping_address: shopifyOrder.shipping_address ? {
          street1: sanitizeString(shopifyOrder.shipping_address.address1, 255) || '',
          street2: sanitizeString(shopifyOrder.shipping_address.address2, 255) || '',
          city: sanitizeString(shopifyOrder.shipping_address.city, 100) || '',
          state: sanitizeString(shopifyOrder.shipping_address.province_code, 10) || '',
          zip: sanitizeString(shopifyOrder.shipping_address.zip, 20) || '',
          country: sanitizeString(shopifyOrder.shipping_address.country_code, 2) || 'US'
        } : null,
        items: shopifyOrder.line_items?.map((item: any) => ({
          sku: sanitizeString(item.sku || item.name, 100),
          name: sanitizeString(item.name, 255),
          quantity: item.quantity,
          unitPrice: parseFloat(item.price)
        })) || [],
        value: parseFloat(shopifyOrder.total_price || '0'),
        order_date: shopifyOrder.created_at,
        status: 'processing',
        company_id: company.id,
        warehouse_id: warehouse?.id || null,
        user_id: null, // Will be set by trigger
      };

      // Create order in Ship Tornado
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        throw orderError;
      }

      console.log('Created order:', newOrder.id);

      // Create mapping
      await supabase
        .from('shopify_order_mappings')
        .insert({
          company_id: company.id,
          ship_tornado_order_id: newOrder.id,
          shopify_order_id: shopifyOrder.id.toString(),
          shopify_order_number: shopifyOrder.order_number.toString(),
          sync_status: 'synced',
        });

      // Log sync event
      await supabase
        .from('shopify_sync_logs')
        .insert({
          company_id: company.id,
          sync_type: 'order_import',
          direction: 'inbound',
          status: 'success',
          shopify_order_id: shopifyOrder.id.toString(),
          ship_tornado_order_id: newOrder.id,
          metadata: { order_number: shopifyOrder.order_number },
        });

      return new Response(JSON.stringify({ success: true, order_id: newOrder.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

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

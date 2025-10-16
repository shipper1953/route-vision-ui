import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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

    // Verify HMAC
    if (hmacHeader && shopifySettings?.webhook_secret) {
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
        console.error('HMAC verification failed');
        throw new Error('Invalid webhook signature');
      }
    }

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

      // Transform Shopify order to Ship Tornado format
      const orderData = {
        order_id: `SHOP-${shopifyOrder.order_number}`,
        customer_name: `${shopifyOrder.customer?.first_name || ''} ${shopifyOrder.customer?.last_name || ''}`.trim() || 'Unknown',
        customer_email: shopifyOrder.customer?.email || null,
        customer_phone: shopifyOrder.customer?.phone || null,
        customer_company: shopifyOrder.customer?.company || null,
        shipping_address: shopifyOrder.shipping_address ? {
          street1: shopifyOrder.shipping_address.address1 || '',
          street2: shopifyOrder.shipping_address.address2 || '',
          city: shopifyOrder.shipping_address.city || '',
          state: shopifyOrder.shipping_address.province_code || '',
          zip: shopifyOrder.shipping_address.zip || '',
          country: shopifyOrder.shipping_address.country_code || 'US'
        } : null,
        items: shopifyOrder.line_items?.map((item: any) => ({
          sku: item.sku || item.name,
          name: item.name,
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

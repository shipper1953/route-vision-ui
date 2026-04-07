import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-shop-domain, x-shopify-topic',
};

async function verifyHmac(rawBody: string, hmacHeader: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const computedHmac = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return computedHmac === hmacHeader;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256');
    const shopDomain = req.headers.get('x-shopify-shop-domain');
    const topic = req.headers.get('x-shopify-topic');

    console.log('Received Shopify compliance webhook:', { shopDomain, topic });

    // Verify HMAC signature
    const apiSecret = Deno.env.get('SHOPIFY_API_SECRET');
    if (!apiSecret) {
      console.error('SHOPIFY_API_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (hmacHeader) {
      const valid = await verifyHmac(rawBody, hmacHeader, apiSecret);
      if (!valid) {
        console.error('HMAC verification failed for compliance webhook');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('✅ HMAC verified for compliance webhook');
    }

    const payload = JSON.parse(rawBody);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log the compliance request
    await supabase.from('shopify_sync_logs').insert({
      company_id: null,
      shopify_store_id: null,
      sync_type: `compliance_${topic?.replace('/', '_') || 'unknown'}`,
      direction: 'inbound',
      status: 'success',
      metadata: {
        shop_domain: shopDomain,
        topic,
        payload_summary: {
          shop_id: payload.shop_id,
          shop_domain: payload.shop_domain,
          // Don't log customer PII — just note we received it
          has_customer: !!payload.customer,
          has_orders_requested: !!payload.orders_requested,
        },
      },
    });

    // Handle each compliance topic
    switch (topic) {
      case 'customers/data_request': {
        // Shopify is asking us to report what customer data we store.
        // As a 3PL, we store: name, email, phone, shipping address on orders.
        // We acknowledge the request — actual data export would be handled manually.
        console.log('📋 Customer data request received for shop:', shopDomain);
        break;
      }

      case 'customers/redact': {
        // Shopify is asking us to delete customer data.
        // Redact PII from orders for this customer.
        const customerEmail = payload.customer?.email;
        const shopId = payload.shop_id?.toString();

        if (customerEmail && shopId) {
          console.log('🗑️ Customer redact request — clearing PII for:', customerEmail);

          // Nullify PII on orders matching this customer email
          const { error } = await supabase
            .from('orders')
            .update({
              customer_email: null,
              customer_phone: null,
              customer_name: '[REDACTED]',
            })
            .eq('customer_email', customerEmail);

          if (error) {
            console.error('Error redacting customer data:', error);
          } else {
            console.log('✅ Customer PII redacted successfully');
          }
        }
        break;
      }

      case 'shop/redact': {
        // Shopify is asking us to delete all data for this shop.
        // This happens 48 hours after a store uninstalls the app.
        const shopId = payload.shop_id?.toString();
        const domain = payload.shop_domain;

        console.log('🏪 Shop redact request for:', domain);

        if (domain) {
          // Mark store as inactive (data cleanup can be handled via admin)
          const { error } = await supabase
            .from('shopify_stores')
            .update({ is_active: false })
            .eq('store_url', domain);

          if (error) {
            console.error('Error deactivating store:', error);
          } else {
            console.log('✅ Store deactivated for redaction:', domain);
          }
        }
        break;
      }

      default:
        console.log('Unknown compliance topic:', topic);
    }

    // Shopify expects a 200 response
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Compliance webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

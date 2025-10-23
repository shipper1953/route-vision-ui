import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-shop-domain',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function verifyShopifyWebhook(body: string, hmacHeader: string | null): Promise<boolean> {
  if (!hmacHeader) {
    console.error('Missing HMAC header');
    return false;
  }

  try {
    const apiSecret = Deno.env.get('SHOPIFY_API_SECRET');
    if (!apiSecret) {
      console.error('SHOPIFY_API_SECRET not configured');
      return false;
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const base64Hash = btoa(String.fromCharCode(...new Uint8Array(signature)));

    return base64Hash === hmacHeader;
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const hmacHeader = req.headers.get('x-shopify-hmac-sha256');
    const shopDomain = req.headers.get('x-shopify-shop-domain');
    const rawBody = await req.text();

    // Verify HMAC signature
    const isValid = await verifyShopifyWebhook(rawBody, hmacHeader);
    if (!isValid) {
      console.error('HMAC verification failed for customer redaction');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.parse(rawBody);
    console.log('Received customer redaction request:', { 
      shop_domain: payload.shop_domain,
      customer_id: payload.customer?.id,
      customer_email: payload.customer?.email 
    });

    const { shop_domain, customer, orders_to_redact } = payload;

    // Handle Shopify webhook verification/test requests
    if (!shop_domain || !customer) {
      console.log('Received webhook verification or test request');
      return new Response(
        JSON.stringify({ 
          message: 'Webhook endpoint is active and ready to receive GDPR requests',
          status: 'ok'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the company associated with this Shopify domain
    const { data: credentials, error: credError } = await supabase
      .from('shopify_credentials')
      .select('company_id')
      .eq('store_url', shop_domain)
      .single();

    if (credError || !credentials) {
      console.warn('Shopify credentials not found for shop:', shop_domain);
      return new Response(
        JSON.stringify({ 
          message: 'No data found to redact for this customer',
          shop_domain 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyId = credentials.company_id;

    // Find orders associated with this customer
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('company_id', companyId)
      .or(`customer_email.eq.${customer.email},customer_phone.eq.${customer.phone}`);

    if (ordersError) {
      console.error('Error finding customer orders:', ordersError);
      throw ordersError;
    }

    const orderIds = orders?.map(o => o.id) || [];
    
    if (orderIds.length === 0) {
      console.log('No orders found for customer:', customer.email);
      return new Response(
        JSON.stringify({ 
          message: 'No data found to redact',
          customer_email: customer.email 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Anonymize customer data in orders
    // We keep order records for accounting but remove PII
    const anonymizedData = {
      customer_name: 'REDACTED',
      customer_email: `redacted-${crypto.randomUUID()}@privacy.invalid`,
      customer_phone: 'REDACTED',
      customer_company: 'REDACTED',
      shipping_address: {
        name: 'REDACTED',
        company: 'REDACTED',
        street1: 'REDACTED',
        street2: 'REDACTED',
        city: 'REDACTED',
        state: 'XX',
        zip: 'XXXXX',
        country: 'XX',
        phone: 'REDACTED',
        email: 'redacted@privacy.invalid',
      },
    };

    const { error: updateOrdersError } = await supabase
      .from('orders')
      .update(anonymizedData)
      .in('id', orderIds);

    if (updateOrdersError) {
      console.error('Error anonymizing orders:', updateOrdersError);
      throw updateOrdersError;
    }

    // Anonymize shipment addresses
    const { data: orderShipments } = await supabase
      .from('order_shipments')
      .select('shipment_id')
      .in('order_id', orderIds);

    const shipmentIds = orderShipments?.map(s => s.shipment_id) || [];

    if (shipmentIds.length > 0) {
      const anonymizedShipmentAddress = {
        name: 'REDACTED',
        company: 'REDACTED',
        street1: 'REDACTED',
        street2: 'REDACTED',
        city: 'REDACTED',
        state: 'XX',
        zip: 'XXXXX',
        country: 'XX',
        phone: 'REDACTED',
        email: 'redacted@privacy.invalid',
      };

      const { error: updateShipmentsError } = await supabase
        .from('shipments')
        .update({ to_address: anonymizedShipmentAddress })
        .in('id', shipmentIds);

      if (updateShipmentsError) {
        console.error('Error anonymizing shipments:', updateShipmentsError);
      }
    }

    // Log the redaction for compliance tracking
    await supabase.from('analytics_events').insert({
      company_id: companyId,
      event_type: 'gdpr_customer_redaction',
      payload: {
        customer_email: customer.email,
        shop_domain,
        orders_anonymized: orderIds.length,
        shipments_anonymized: shipmentIds.length,
        redacted_at: new Date().toISOString(),
      },
    });

    console.log('Customer data redaction completed:', {
      orders_anonymized: orderIds.length,
      shipments_anonymized: shipmentIds.length,
    });

    return new Response(
      JSON.stringify({ 
        message: 'Customer data redaction completed successfully',
        orders_processed: orderIds.length,
        shipments_processed: shipmentIds.length,
        redaction_note: 'Personal information has been anonymized. Order records retained for 7 years per legal requirements.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing customer redaction:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error processing redaction request',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

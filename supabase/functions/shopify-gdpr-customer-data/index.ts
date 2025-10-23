import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-shop-domain',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function verifyShopifyWebhook(body: string, hmacHeader: string | null, shopDomain: string, supabase: any): Promise<boolean> {
  if (!hmacHeader || !shopDomain) {
    console.error('Missing HMAC header or shop domain');
    return false;
  }

  try {
    const { data: credentials, error } = await supabase
      .from('shopify_credentials')
      .select('webhook_secret')
      .eq('shop_domain', shopDomain)
      .single();

    if (error || !credentials?.webhook_secret) {
      console.error('Could not fetch webhook secret:', error);
      return false;
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(credentials.webhook_secret),
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
    if (shopDomain) {
      const isValid = await verifyShopifyWebhook(rawBody, hmacHeader, shopDomain, supabase);
      if (!isValid) {
        console.error('HMAC verification failed for customer data request');
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const payload = JSON.parse(rawBody);
    console.log('Received customer data request:', { 
      shop_domain: payload.shop_domain,
      customer_id: payload.customer?.id,
      orders_requested: payload.orders_requested?.length 
    });

    const { shop_domain, customer, orders_requested } = payload;

    if (!shop_domain || !customer) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: shop_domain or customer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the company associated with this Shopify domain
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('settings->>shopify_domain', shop_domain)
      .single();

    if (companyError || !company) {
      console.warn('Company not found for shop:', shop_domain);
      return new Response(
        JSON.stringify({ 
          message: 'No data found for this customer',
          customer_email: customer.email 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Collect all customer data from orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_id, order_date, customer_name, customer_email, customer_phone, customer_company, shipping_address, items, value, status, created_at')
      .eq('company_id', company.id)
      .or(`customer_email.eq.${customer.email},customer_phone.eq.${customer.phone}`)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
    }

    // Collect shipment data for these orders
    const orderIds = orders?.map(o => o.id) || [];
    const { data: shipments, error: shipmentsError } = await supabase
      .from('order_shipments')
      .select('shipment_id, order_id, package_info, created_at')
      .in('order_id', orderIds);

    if (shipmentsError) {
      console.error('Error fetching shipments:', shipmentsError);
    }

    // Get full shipment details
    const shipmentIds = shipments?.map(s => s.shipment_id) || [];
    const { data: shipmentDetails, error: shipmentDetailsError } = await supabase
      .from('shipments')
      .select('id, tracking_number, carrier, service, status, to_address, cost, created_at, estimated_delivery_date, actual_delivery_date')
      .in('id', shipmentIds);

    if (shipmentDetailsError) {
      console.error('Error fetching shipment details:', shipmentDetailsError);
    }

    // Prepare data export
    const customerDataExport = {
      request_id: crypto.randomUUID(),
      requested_at: new Date().toISOString(),
      customer: {
        email: customer.email,
        phone: customer.phone,
        name: orders?.[0]?.customer_name || 'Unknown',
      },
      shop_domain,
      orders: orders?.map(order => ({
        order_number: order.order_id,
        order_date: order.order_date,
        status: order.status,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        customer_company: order.customer_company,
        shipping_address: order.shipping_address,
        items: order.items,
        order_value: order.value,
        created_at: order.created_at,
      })) || [],
      shipments: shipmentDetails?.map(shipment => ({
        tracking_number: shipment.tracking_number,
        carrier: shipment.carrier,
        service: shipment.service,
        status: shipment.status,
        delivery_address: shipment.to_address,
        cost: shipment.cost,
        created_at: shipment.created_at,
        estimated_delivery: shipment.estimated_delivery_date,
        actual_delivery: shipment.actual_delivery_date,
      })) || [],
      data_retention_policy: 'Order and shipment data is retained for 7 years for accounting purposes. You may request deletion subject to legal requirements.',
      contact_email: 'privacy@shiptornado.com',
    };

    // Log the data request for compliance tracking
    await supabase.from('analytics_events').insert({
      company_id: company.id,
      event_type: 'gdpr_customer_data_request',
      payload: {
        customer_email: customer.email,
        shop_domain,
        orders_count: orders?.length || 0,
        shipments_count: shipmentDetails?.length || 0,
      },
    });

    console.log('Customer data request processed successfully:', {
      orders_count: orders?.length || 0,
      shipments_count: shipmentDetails?.length || 0,
    });

    return new Response(
      JSON.stringify(customerDataExport),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="customer-data-${customer.email}-${new Date().toISOString()}.json"`,
        } 
      }
    );

  } catch (error) {
    console.error('Error processing customer data request:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error processing data request',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

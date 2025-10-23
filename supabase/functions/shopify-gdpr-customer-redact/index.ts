import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-shop-domain',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    const payload = await req.json();
    console.log('Received customer redaction request:', { 
      shop_domain: payload.shop_domain,
      customer_id: payload.customer?.id,
      customer_email: payload.customer?.email 
    });

    const { shop_domain, customer, orders_to_redact } = payload;

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
          message: 'No data found to redact for this customer',
          customer_email: customer.email 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find orders associated with this customer
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('company_id', company.id)
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
      company_id: company.id,
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

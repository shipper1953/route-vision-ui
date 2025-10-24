import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-shop-domain',
};

function verifyShopifyWebhook(body: string, hmacHeader: string, secret: string): boolean {
  const hash = createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');
  return hash === hmacHeader;
}

interface FulfillmentOrderWebhook {
  fulfillment_order: {
    id: number;
    shop_id: number;
    order_id: number;
    assigned_location_id: number;
    request_status: string;
    status: string;
    destination: {
      id: number;
      address1: string;
      address2: string | null;
      city: string;
      company: string | null;
      country: string;
      email: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      province: string;
      zip: string;
    };
    line_items: Array<{
      id: number;
      shop_id: number;
      fulfillment_order_id: number;
      quantity: number;
      line_item_id: number;
      inventory_item_id: number;
      fulfillable_quantity: number;
      variant_id: number;
    }>;
    fulfill_at: string;
    fulfill_by: string | null;
    international_duties: any;
    fulfillment_holds: any[];
    created_at: string;
    updated_at: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const shopDomain = req.headers.get('x-shopify-shop-domain');
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256');
    
    if (!shopDomain || !hmacHeader) {
      console.error('Missing required headers');
      return new Response(
        JSON.stringify({ error: 'Missing required headers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.text();
    let webhook: FulfillmentOrderWebhook;

    // Parse and validate webhook body
    try {
      webhook = JSON.parse(body);
    } catch (parseError) {
      console.error('Failed to parse webhook body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!webhook.fulfillment_order) {
      console.error('Missing fulfillment_order in webhook payload');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook payload: missing fulfillment_order' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received fulfillment order notification:', {
      shop: shopDomain,
      fulfillmentOrderId: webhook.fulfillment_order.id,
      orderId: webhook.fulfillment_order.order_id,
      status: webhook.fulfillment_order.status,
      requestStatus: webhook.fulfillment_order.request_status,
    });

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

    if (!shopifySettings?.webhook_secret) {
      console.error('No webhook secret configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify webhook signature
    if (!verifyShopifyWebhook(body, hmacHeader, shopifySettings.webhook_secret)) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find matching Ship Tornado order
    const shopifyOrderId = `gid://shopify/Order/${webhook.fulfillment_order.order_id}`;
    const { data: mapping } = await supabase
      .from('shopify_order_mappings')
      .select('ship_tornado_order_id')
      .eq('shopify_order_id', shopifyOrderId)
      .eq('company_id', company.id)
      .single();

    // Store fulfillment order
    const { error: insertError } = await supabase
      .from('shopify_fulfillment_orders')
      .insert({
        company_id: company.id,
        ship_tornado_order_id: mapping?.ship_tornado_order_id || null,
        shopify_order_id: shopifyOrderId,
        fulfillment_order_id: `gid://shopify/FulfillmentOrder/${webhook.fulfillment_order.id}`,
        fulfillment_order_number: webhook.fulfillment_order.id.toString(),
        status: webhook.fulfillment_order.status,
        request_status: webhook.fulfillment_order.request_status,
        line_items: webhook.fulfillment_order.line_items,
        assigned_location_id: `gid://shopify/Location/${webhook.fulfillment_order.assigned_location_id}`,
        destination: webhook.fulfillment_order.destination,
        metadata: {
          fulfill_at: webhook.fulfillment_order.fulfill_at,
          fulfill_by: webhook.fulfillment_order.fulfill_by,
        },
      });

    if (insertError) {
      console.error('Error inserting fulfillment order:', insertError);
      // Continue anyway - don't fail the webhook
    }

    // Log the event
    await supabase.from('shopify_sync_logs').insert({
      company_id: company.id,
      sync_type: 'fulfillment_order_notification',
      direction: 'inbound',
      status: 'success',
      shopify_order_id: shopifyOrderId,
      ship_tornado_order_id: mapping?.ship_tornado_order_id || null,
      metadata: {
        fulfillment_order_id: webhook.fulfillment_order.id,
        request_status: webhook.fulfillment_order.request_status,
        status: webhook.fulfillment_order.status,
        line_item_count: webhook.fulfillment_order.line_items.length,
      },
    });

    // Respond to Shopify with acceptance (MUST respond within 5 seconds)
    const response = {
      fulfillment_order: {
        id: `gid://shopify/FulfillmentOrder/${webhook.fulfillment_order.id}`,
        status: 'open'
      },
      message: 'Accepted - Ship Tornado will fulfill this order'
    };

    console.log('Fulfillment order accepted:', webhook.fulfillment_order.id);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error processing fulfillment order notification:', error);
    
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

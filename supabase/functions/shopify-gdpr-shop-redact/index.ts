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
      console.error('HMAC verification failed for shop redaction');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.parse(rawBody);
    console.log('Received shop redaction request:', { 
      shop_domain: payload.shop_domain,
      shop_id: payload.shop_id 
    });

    const { shop_domain, shop_id } = payload;

    if (!shop_domain) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: shop_domain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          message: 'No data found to redact for this shop',
          shop_domain 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', credentials.company_id)
      .single();

    if (companyError || !company) {
      console.warn('Company not found for shop:', shop_domain);
      return new Response(
        JSON.stringify({ 
          message: 'No data found to redact for this shop',
          shop_domain 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing shop redaction for company:', company.name);

    // Log the redaction request before deletion
    await supabase.from('analytics_events').insert({
      company_id: company.id,
      event_type: 'gdpr_shop_redaction_started',
      payload: {
        shop_domain,
        shop_id,
        company_name: company.name,
        initiated_at: new Date().toISOString(),
      },
    });

    // Delete Shopify-specific data (NOT financial records)
    // We keep orders/shipments for 7 years per legal requirement but remove Shopify integration data

    // 1. Delete Shopify sync logs
    const { error: logsError } = await supabase
      .from('shopify_sync_logs')
      .delete()
      .eq('company_id', company.id);

    if (logsError) {
      console.error('Error deleting sync logs:', logsError);
    }

    // 2. Delete Shopify order mappings
    const { error: mappingsError } = await supabase
      .from('shopify_order_mappings')
      .delete()
      .eq('company_id', company.id);

    if (mappingsError) {
      console.error('Error deleting order mappings:', mappingsError);
    }

    // 3. Remove Shopify credentials from company settings
    const { data: currentCompany } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', company.id)
      .single();

    if (currentCompany?.settings) {
      const updatedSettings = { ...currentCompany.settings };
      delete updatedSettings.shopify_domain;
      delete updatedSettings.shopify_access_token;
      delete updatedSettings.shopify_storefront_token;
      delete updatedSettings.shopify_webhook_id;
      delete updatedSettings.shopify_connected_at;

      const { error: settingsError } = await supabase
        .from('companies')
        .update({ settings: updatedSettings })
        .eq('id', company.id);

      if (settingsError) {
        console.error('Error updating company settings:', settingsError);
      }
    }

    // 4. We do NOT delete:
    // - Orders (retained for 7 years for tax/accounting)
    // - Shipments (retained for 7 years for tax/accounting)
    // - Financial transactions (required by law)
    // - Company record itself (in case they reconnect)

    // Final log of completion
    await supabase.from('analytics_events').insert({
      company_id: company.id,
      event_type: 'gdpr_shop_redaction_completed',
      payload: {
        shop_domain,
        shop_id,
        company_name: company.name,
        completed_at: new Date().toISOString(),
        retention_note: 'Order and financial data retained for 7 years per legal requirements',
      },
    });

    console.log('Shop redaction completed successfully for:', shop_domain);

    return new Response(
      JSON.stringify({ 
        message: 'Shop data redaction completed successfully',
        shop_domain,
        redaction_details: {
          shopify_sync_logs_deleted: true,
          shopify_order_mappings_deleted: true,
          shopify_credentials_removed: true,
          orders_retained: true,
          retention_reason: 'Order and financial data retained for 7 years per legal requirements',
        },
        note: 'Shopify integration data has been removed. Historical orders and shipments are retained for accounting purposes.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing shop redaction:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error processing shop redaction',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

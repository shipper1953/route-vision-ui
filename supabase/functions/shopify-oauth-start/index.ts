import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { storeUrl, companyId, customerName, customerEmail, customerReference } = await req.json();

    if (!storeUrl || !companyId) {
      throw new Error('Store URL and company ID are required');
    }

    // Clean up store URL
    const cleanUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Get Shopify app credentials
    const apiKey = Deno.env.get('SHOPIFY_API_KEY');
    if (!apiKey) {
      throw new Error('Shopify API key not configured');
    }

    // Generate state parameter for OAuth security
    const state = crypto.randomUUID();

    // Create or update shopify_stores record with OAuth state
    const { error: storeError } = await supabase
      .from('shopify_stores')
      .upsert({
        company_id: companyId,
        store_url: cleanUrl,
        oauth_state: state,
        customer_name: customerName || null,
        customer_email: customerEmail || null,
        customer_reference: customerReference || null,
        is_active: false, // Will be activated after OAuth completion
        access_token: 'pending', // Placeholder, will be updated in callback
      }, {
        onConflict: 'company_id,store_url',
      });

    if (storeError) {
      console.error('Error storing OAuth state:', storeError);
      throw new Error('Failed to initiate OAuth flow');
    }

    // Build OAuth authorization URL
    const redirectUri = `${supabaseUrl}/functions/v1/shopify-oauth-callback`;
    const scopes = [
      'read_orders',
      'write_orders',
      'read_assigned_fulfillment_orders',
      'write_assigned_fulfillment_orders',
      'read_products',
      'write_products',
      'read_inventory',
      'write_inventory',
      'read_locations',
      'read_shipping',
    ].join(',');

    const authUrl = `https://${cleanUrl}/admin/oauth/authorize?` +
      `client_id=${apiKey}&` +
      `scope=${scopes}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`;

    console.log('Generated OAuth URL for store:', cleanUrl);
    // SECURITY: Never log full URLs or API keys in production
    console.log('OAuth flow initiated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        authUrl,
        state,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('OAuth start error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

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

    const { storeUrl, companyId } = await req.json();

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

    // Store state in company settings for verification
    const { data: company } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    const existingSettings = company?.settings || {};
    
    const updatedSettings = {
      ...existingSettings,
      shopify: {
        ...(existingSettings.shopify || {}),
        oauth_state: state,
        store_url: cleanUrl,
      },
    };

    await supabase
      .from('companies')
      .update({ settings: updatedSettings })
      .eq('id', companyId);

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
    console.log('Full OAuth URL:', authUrl);
    console.log('Redirect URI:', redirectUri);
    console.log('API Key:', apiKey);

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

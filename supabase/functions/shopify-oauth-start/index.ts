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

    const { storeUrl, companyId, customerId, customerName, customerReference } = await req.json();

    if (!storeUrl || !companyId || !customerId) {
      throw new Error('Store URL, company ID, and customer ID are required');
    }

    // Clean up store URL
    let cleanUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Validate it's a proper Shopify domain
    if (!cleanUrl.includes('.myshopify.com')) {
      throw new Error(`Invalid Shopify store URL: "${cleanUrl}". Please use your store's .myshopify.com domain (e.g., your-store.myshopify.com), not an admin URL.`);
    }
    
    // Additional validation for admin URLs that might have slipped through
    if (cleanUrl.includes('admin.shopify.com')) {
      throw new Error('Please use your actual store domain (your-store.myshopify.com), not an admin.shopify.com URL');
    }

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
        customer_id: customerId,
        customer_name: customerName || null,
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

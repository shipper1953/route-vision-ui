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

    const { companyId, customerId, customerName, customerReference, storeUrl, accessToken } = await req.json();

    if (!companyId || !customerId || !storeUrl || !accessToken) {
      throw new Error('Company ID, customer ID, store URL, and access token are required');
    }

    // Clean up store URL
    let cleanUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Validate it's a proper Shopify domain
    if (!cleanUrl.includes('.myshopify.com')) {
      throw new Error(`Invalid Shopify store URL: "${cleanUrl}". Please use your store's .myshopify.com domain (e.g., your-store.myshopify.com), not an admin URL.`);
    }
    
    // Additional validation for admin URLs
    if (cleanUrl.includes('admin.shopify.com')) {
      throw new Error('Please use your actual store domain (your-store.myshopify.com), not an admin.shopify.com URL');
    }

    // Generate webhook secret
    const webhookSecret = crypto.randomUUID();

    // Register webhook with Shopify
    const webhookUrl = `${supabaseUrl}/functions/v1/shopify-webhook`;
    
    const registerWebhook = async (topic: string) => {
      const response = await fetch(
        `https://${cleanUrl}/admin/api/2024-01/webhooks.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webhook: {
              topic,
              address: webhookUrl,
              format: 'json',
            },
          }),
        }
      );

      if (!response.ok) {
        console.error(`Failed to register ${topic} webhook:`, await response.text());
        throw new Error(`Failed to register ${topic} webhook`);
      }

      return await response.json();
    };

    // Register webhooks
    await registerWebhook('orders/create');

    console.log('Webhooks registered successfully');

    // Create or update shopify_stores record
    const { error: storeError } = await supabase
      .from('shopify_stores')
      .upsert({
        company_id: companyId,
        store_url: cleanUrl,
        customer_id: customerId,
        customer_name: customerName || null,
        customer_reference: customerReference || null,
        access_token: accessToken,
        webhook_secret: webhookSecret,
        is_active: true,
        connected_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
      }, {
        onConflict: 'company_id,store_url',
      });

    if (storeError) {
      console.error('Error saving store:', storeError);
      throw storeError;
    }

    if (updateError) {
      console.error('Error updating company settings:', updateError);
      throw updateError;
    }

    // Log connection
    await supabase
      .from('shopify_sync_logs')
      .insert({
        company_id: companyId,
        sync_type: 'connection',
        direction: 'outbound',
        status: 'success',
        metadata: { store_url: cleanUrl },
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Shopify connected successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Save credentials error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

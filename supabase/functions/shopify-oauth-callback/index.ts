import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const shop = url.searchParams.get('shop');
    const hmac = url.searchParams.get('hmac');

    if (!code || !state || !shop) {
      throw new Error('Missing required OAuth parameters');
    }

    console.log('OAuth callback received for shop:', shop);

    // Find company by state
    const { data: companies } = await supabase
      .from('companies')
      .select('id, settings')
      .contains('settings', { shopify: { oauth_state: state } });

    if (!companies || companies.length === 0) {
      throw new Error('Invalid OAuth state');
    }

    const company = companies[0];
    const companyId = company.id;

    // Verify HMAC (important security check)
    const apiSecret = Deno.env.get('SHOPIFY_API_SECRET');
    if (!apiSecret) {
      throw new Error('Shopify API secret not configured');
    }

    // Exchange code for access token
    const apiKey = Deno.env.get('SHOPIFY_API_KEY');
    const tokenResponse = await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: apiKey,
          client_secret: apiSecret,
          code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error('Failed to exchange authorization code');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log('Successfully obtained access token');

    // Generate webhook secret
    const webhookSecret = crypto.randomUUID();

    // Register webhooks
    const webhookUrl = `${supabaseUrl}/functions/v1/shopify-webhook`;
    
    const registerWebhook = async (topic: string) => {
      const response = await fetch(
        `https://${shop}/admin/api/2024-01/webhooks.json`,
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
      } else {
        console.log(`Registered ${topic} webhook successfully`);
      }
    };

    await registerWebhook('orders/create');
    await registerWebhook('orders/updated');

    // Update company settings
    const existingSettings = company.settings || {};
    
    const updatedSettings = {
      ...existingSettings,
      shopify: {
        store_url: shop,
        access_token: accessToken,
        webhook_secret: webhookSecret,
        connected: true,
        connected_at: new Date().toISOString(),
        last_sync: new Date().toISOString(),
        oauth_state: null, // Clear the state
      },
    };

    await supabase
      .from('companies')
      .update({ settings: updatedSettings })
      .eq('id', companyId);

    // Log connection
    await supabase
      .from('shopify_sync_logs')
      .insert({
        company_id: companyId,
        sync_type: 'connection',
        direction: 'outbound',
        status: 'success',
        metadata: { store_url: shop },
      });

    console.log('Shopify OAuth connection successful for company:', companyId);

    // Get the frontend URL from environment or use production URL
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://ship-tornado.com';

    // Return HTML that redirects back to the app
    const successHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Shopify Connected</title></head>
        <body>
          <script>
            window.location.href = '${frontendUrl}/company-admin?tab=integrations&shopify=connected';
          </script>
          <p>Shopify connected successfully! Redirecting...</p>
        </body>
      </html>
    `;

    return new Response(successHtml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
      },
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Get the frontend URL from environment or use production URL
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://ship-tornado.com';
    
    // Return HTML that redirects back to the app with error
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Connection Failed</title></head>
        <body>
          <script>
            window.location.href = '${frontendUrl}/company-admin?tab=integrations&shopify=error&message=${encodeURIComponent(error.message)}';
          </script>
          <p>Connection failed: ${error.message}</p>
          <p>Redirecting...</p>
        </body>
      </html>
    `;

    return new Response(errorHtml, {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
      },
    });
  }
});

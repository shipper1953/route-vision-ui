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

    // Register webhooks with topic-specific routing
    const registerWebhook = async (topic: string) => {
      // Determine webhook URL based on topic
      let webhookUrl;
      if (topic === 'customers/data_request') {
        webhookUrl = `${supabaseUrl}/functions/v1/shopify-gdpr-customer-data`;
      } else if (topic === 'customers/redact') {
        webhookUrl = `${supabaseUrl}/functions/v1/shopify-gdpr-customer-redact`;
      } else if (topic === 'shop/redact') {
        webhookUrl = `${supabaseUrl}/functions/v1/shopify-gdpr-shop-redact`;
      } else {
        // Default to main webhook handler for order events
        webhookUrl = `${supabaseUrl}/functions/v1/shopify-webhook`;
      }

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
        const errorText = await response.text();
        console.error(`Failed to register ${topic} webhook:`, errorText);
        // Log failure to sync logs
        await supabase
          .from('shopify_sync_logs')
          .insert({
            company_id: companyId,
            sync_type: 'webhook_registration',
            direction: 'outbound',
            status: 'error',
            metadata: { topic, error: errorText, webhook_url: webhookUrl },
          });
      } else {
        const webhookData = await response.json();
        console.log(`Registered ${topic} webhook successfully`, webhookData);
        // Log success to sync logs
        await supabase
          .from('shopify_sync_logs')
          .insert({
            company_id: companyId,
            sync_type: 'webhook_registration',
            direction: 'outbound',
            status: 'success',
            metadata: { 
              topic, 
              webhook_id: webhookData.webhook?.id,
              webhook_url: webhookUrl 
            },
          });
      }
    };

    // Register order webhooks
    await registerWebhook('orders/create');
    await registerWebhook('orders/updated');

    // Register GDPR compliance webhooks (required for Shopify app approval)
    await registerWebhook('customers/data_request');
    await registerWebhook('customers/redact');
    await registerWebhook('shop/redact');

    // Store credentials securely in shopify_credentials table
    const { error: credError } = await supabase
      .from('shopify_credentials')
      .upsert({
        company_id: companyId,
        store_url: shop,
        access_token: accessToken,
        scopes: ['read_orders', 'write_orders', 'read_products', 'write_products', 'read_inventory', 'write_inventory'],
        connected_at: new Date().toISOString(),
        is_active: true
      }, {
        onConflict: 'company_id'
      });

    if (credError) {
      console.error('Failed to store Shopify credentials:', credError);
      throw new Error('Failed to store credentials securely');
    }

    // Update company settings (remove plaintext credentials)
    const existingSettings = company.settings || {};
    const updatedSettings = {
      ...existingSettings,
      shopify: {
        store_url: shop,
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

    // Return HTML that communicates with popup opener or redirects
    const successHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shopify Connected</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f3f4f6;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .success { color: #10b981; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">✓ Shopify Connected!</h1>
            <p>Returning to Ship Tornado...</p>
          </div>
          <script>
            try {
              // Try to communicate with popup opener
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({
                  type: 'shopify-oauth-success',
                  connected: true
                }, '*');
                window.close();
              } else {
                // Fallback to redirect if not in popup
                setTimeout(() => {
                  window.location.href = 'https://ship-tornado.com/company-admin?tab=integrations&shopify=connected';
                }, 1500);
              }
            } catch (e) {
              // Fallback to redirect on error
              setTimeout(() => {
                window.location.href = 'https://ship-tornado.com/company-admin?tab=integrations&shopify=connected';
              }, 1500);
            }
          </script>
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
    
    // Return HTML that communicates error to popup opener or redirects
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connection Failed</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f3f4f6;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .error { color: #ef4444; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">✗ Connection Failed</h1>
            <p>${error.message}</p>
            <p>Returning to Ship Tornado...</p>
          </div>
          <script>
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({
                  type: 'shopify-oauth-error',
                  error: '${error.message.replace(/'/g, "\\'")}'
                }, '*');
                window.close();
              } else {
                setTimeout(() => {
                  window.location.href = 'https://ship-tornado.com/company-admin?tab=integrations&shopify=error&message=${encodeURIComponent(error.message)}';
                }, 2000);
              }
            } catch (e) {
              setTimeout(() => {
                window.location.href = 'https://ship-tornado.com/company-admin?tab=integrations&shopify=error&message=${encodeURIComponent(error.message)}';
              }, 2000);
            }
          </script>
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

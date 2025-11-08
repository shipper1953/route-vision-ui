import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookRegistrationRequest {
  storeId: string;
  companyId: string;
}

const WEBHOOK_TOPICS = [
  'purchase_orders/create',
  'purchase_orders/update',
  'inventory_transfers/create',
  'inventory_transfers/update',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { storeId, companyId } = await req.json() as WebhookRegistrationRequest;

    console.log(`[Webhook Registration] Starting for store ${storeId}`);

    // Fetch store details
    const { data: store, error: storeError } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('id', storeId)
      .eq('company_id', companyId)
      .single();

    if (storeError || !store) {
      throw new Error(`Store not found: ${storeError?.message}`);
    }

    const shopifyUrl = store.store_url.replace(/\/$/, '');
    const accessToken = store.access_token;
    const webhookUrl = `${supabaseUrl}/functions/v1/shopify-webhook`;

    const registeredWebhooks = [];
    const errors = [];

    // Register each webhook topic
    for (const topic of WEBHOOK_TOPICS) {
      try {
        // Check if webhook already exists
        const listResponse = await fetch(
          `${shopifyUrl}/admin/api/2024-01/webhooks.json?topic=${topic}`,
          {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!listResponse.ok) {
          throw new Error(`Failed to list webhooks: ${listResponse.status}`);
        }

        const { webhooks } = await listResponse.json();
        const existingWebhook = webhooks?.find((w: any) => w.address === webhookUrl);

        if (existingWebhook) {
          console.log(`Webhook already registered for ${topic}: ${existingWebhook.id}`);
          registeredWebhooks.push({ topic, id: existingWebhook.id, status: 'existing' });
          continue;
        }

        // Register new webhook
        const createResponse = await fetch(
          `${shopifyUrl}/admin/api/2024-01/webhooks.json`,
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

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          throw new Error(`Failed to create webhook: ${createResponse.status} - ${errorText}`);
        }

        const { webhook } = await createResponse.json();
        console.log(`✅ Registered webhook for ${topic}: ${webhook.id}`);
        registeredWebhooks.push({ topic, id: webhook.id, status: 'created' });
      } catch (error) {
        console.error(`Error registering webhook for ${topic}:`, error);
        errors.push({ topic, error: error.message });
      }
    }

    console.log(`[Webhook Registration] Complete: ${registeredWebhooks.length} webhooks registered, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        registered: registeredWebhooks,
        errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Webhook Registration] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

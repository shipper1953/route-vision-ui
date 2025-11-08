import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { storeId } = await req.json();

    if (!storeId) {
      throw new Error('Missing storeId');
    }

    // Get store details
    const { data: store, error: storeError } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      throw new Error('Store not found');
    }

    // Delete webhooks from Shopify
    try {
      // List and delete REST webhooks
      const webhooksResponse = await fetch(
        `https://${store.store_url}/admin/api/2025-01/webhooks.json`,
        {
          headers: {
            'X-Shopify-Access-Token': store.access_token,
            'Content-Type': 'application/json',
          },
        }
      );

      if (webhooksResponse.ok) {
        const webhooksData = await webhooksResponse.json();
        
        for (const webhook of webhooksData.webhooks || []) {
          // Delete webhooks that point to our functions
          if (webhook.address && webhook.address.includes('supabase.co/functions')) {
            await fetch(
              `https://${store.store_url}/admin/api/2025-01/webhooks/${webhook.id}.json`,
              {
                method: 'DELETE',
                headers: {
                  'X-Shopify-Access-Token': store.access_token,
                },
              }
            );
          }
        }
      }

      // Delete GraphQL webhook subscriptions if they exist
      if (store.settings?.webhooks) {
        const deleteWebhookMutation = `
          mutation webhookSubscriptionDelete($id: ID!) {
            webhookSubscriptionDelete(id: $id) {
              deletedWebhookSubscriptionId
              userErrors {
                field
                message
              }
            }
          }
        `;

        for (const webhookId of store.settings.webhooks) {
          await fetch(
            `https://${store.store_url}/admin/api/2025-01/graphql.json`,
            {
              method: 'POST',
              headers: {
                'X-Shopify-Access-Token': store.access_token,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                query: deleteWebhookMutation,
                variables: { id: webhookId },
              }),
            }
          );
        }
      }
    } catch (webhookError) {
      console.error('Error deleting webhooks:', webhookError);
      // Continue even if webhook deletion fails
    }

    // Delete the store record (this will cascade delete related records)
    const { error: deleteError } = await supabase
      .from('shopify_stores')
      .delete()
      .eq('id', storeId);

    if (deleteError) {
      throw new Error(`Failed to delete store: ${deleteError.message}`);
    }

    // Log the disconnection
    await supabase.from('shopify_sync_logs').insert({
      company_id: store.company_id,
      shopify_store_id: storeId,
      sync_type: 'store_disconnect',
      direction: 'outbound',
      status: 'success',
      metadata: {
        store_url: store.store_url,
        disconnected_by: user.id,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Store disconnected successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error disconnecting store:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

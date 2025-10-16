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

    const { companyId } = await req.json();

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Get current settings
    const { data: company } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    const shopifySettings = company?.settings?.shopify;

    if (!shopifySettings) {
      throw new Error('No Shopify connection found');
    }

    // Delete webhooks from Shopify
    try {
      const webhooksResponse = await fetch(
        `https://${shopifySettings.store_url}/admin/api/2024-01/webhooks.json`,
        {
          headers: {
            'X-Shopify-Access-Token': shopifySettings.access_token,
            'Content-Type': 'application/json',
          },
        }
      );

      if (webhooksResponse.ok) {
        const { webhooks } = await webhooksResponse.json();
        const webhookUrl = `${supabaseUrl}/functions/v1/shopify-webhook`;
        
        for (const webhook of webhooks) {
          if (webhook.address === webhookUrl) {
            await fetch(
              `https://${shopifySettings.store_url}/admin/api/2024-01/webhooks/${webhook.id}.json`,
              {
                method: 'DELETE',
                headers: {
                  'X-Shopify-Access-Token': shopifySettings.access_token,
                  'Content-Type': 'application/json',
                },
              }
            );
          }
        }
      }
    } catch (error) {
      console.error('Error deleting webhooks:', error);
    }

    // Clear Shopify settings
    const existingSettings = company?.settings || {};
    delete existingSettings.shopify;

    const { error: updateError } = await supabase
      .from('companies')
      .update({ settings: existingSettings })
      .eq('id', companyId);

    if (updateError) {
      console.error('Error updating company settings:', updateError);
      throw updateError;
    }

    // Log disconnection
    await supabase
      .from('shopify_sync_logs')
      .insert({
        company_id: companyId,
        sync_type: 'disconnection',
        direction: 'outbound',
        status: 'success',
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Shopify disconnected successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Disconnect error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

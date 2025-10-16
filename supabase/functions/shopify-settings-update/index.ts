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

    const { companyId, settings } = await req.json();

    // Get current company settings
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    if (fetchError) throw fetchError;

    // Merge new settings with existing
    const currentSettings = company?.settings || {};
    const updatedSettings = {
      ...currentSettings,
      shopify: {
        ...currentSettings.shopify,
        ...settings,
        sync_config: {
          ...(currentSettings.shopify?.sync_config || {}),
          ...(settings.sync_config || {}),
        },
        features: {
          ...(currentSettings.shopify?.features || {}),
          ...(settings.features || {}),
        },
        mappings: {
          ...(currentSettings.shopify?.mappings || {}),
          ...(settings.mappings || {}),
        },
      },
    };

    // Update company settings
    const { error: updateError } = await supabase
      .from('companies')
      .update({ settings: updatedSettings })
      .eq('id', companyId);

    if (updateError) throw updateError;

    console.log('Shopify settings updated for company:', companyId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error updating Shopify settings:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

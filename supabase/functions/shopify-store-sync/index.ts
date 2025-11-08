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

    // Trigger a bulk import for this specific store
    // This would typically call the bulk import function with store-specific parameters
    const { data, error } = await supabase.functions.invoke('shopify-bulk-import', {
      body: {
        companyId: store.company_id,
        storeId: storeId,
        dateRangeDays: 30,
      },
    });

    if (error) {
      throw error;
    }

    // Update last_sync_at timestamp
    await supabase
      .from('shopify_stores')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', storeId);

    // Log the sync
    await supabase.from('shopify_sync_logs').insert({
      company_id: store.company_id,
      shopify_store_id: storeId,
      sync_type: 'manual_sync',
      direction: 'inbound',
      status: 'success',
      metadata: {
        orders_synced: data?.succeeded || 0,
        triggered_by: user.id,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Sync completed successfully',
        stats: data,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error syncing store:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

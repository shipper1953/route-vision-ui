import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error('Unauthorized');

    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single();
    if (!userProfile) throw new Error('User profile not found');

    const { companyId } = await req.json();
    const targetCompanyId = userProfile.role === 'super_admin' && companyId
      ? companyId
      : userProfile.company_id;

    // Get all active Shopify stores for the company
    const { data: stores, error: storesError } = await supabase
      .from('shopify_stores')
      .select('id, store_name, store_url, access_token, fulfillment_location_id, fulfillment_location_name')
      .eq('company_id', targetCompanyId)
      .eq('is_active', true);

    if (storesError) throw storesError;
    if (!stores || stores.length === 0) {
      return new Response(JSON.stringify({ locations: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allLocations: Array<{
      id: string;
      name: string;
      storeId: string;
      storeName: string;
      isActive: boolean;
    }> = [];

    for (const store of stores) {
      try {
        const storeUrl = store.store_url.replace('https://', '').replace('http://', '');
        const query = `
          query {
            locations(first: 50) {
              edges {
                node {
                  id
                  name
                  isActive
                }
              }
            }
          }
        `;

        const res = await fetch(`https://${storeUrl}/admin/api/2025-01/graphql.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': store.access_token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        });

        if (!res.ok) {
          console.error(`Failed to fetch locations for store ${store.store_name}`);
          continue;
        }

        const result = await res.json();
        const edges = result.data?.locations?.edges || [];

        for (const edge of edges) {
          allLocations.push({
            id: edge.node.id,
            name: edge.node.name,
            storeId: store.id,
            storeName: store.store_name,
            isActive: edge.node.isActive,
          });
        }
      } catch (err) {
        console.error(`Error fetching locations for store ${store.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ locations: allLocations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error listing Shopify locations:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

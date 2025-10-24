import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Utility function to fetch the fulfillment service details from Shopify
 * and update the shared secret in company settings.
 * 
 * Use this for existing fulfillment services that were registered without storing the secret.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { companyId } = await req.json();

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'Missing companyId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch company settings
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    if (fetchError) throw fetchError;

    const shopifySettings = company.settings?.shopify;
    const fulfillmentServiceId = shopifySettings?.fulfillment_service?.id;

    if (!shopifySettings?.access_token || !shopifySettings?.store_url) {
      throw new Error('Shopify not connected for this company');
    }

    if (!fulfillmentServiceId) {
      throw new Error('No fulfillment service registered for this company');
    }

    // Query Shopify for fulfillment service details
    const query = `
      query {
        fulfillmentService(id: "${fulfillmentServiceId}") {
          id
          handle
          location {
            id
            name
          }
          callbackUrl
          serviceName
          sharedSecret
        }
      }
    `;

    const response = await fetch(
      `https://${shopifySettings.store_url}/admin/api/2025-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': shopifySettings.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(`GraphQL error: ${result.errors.map((e: any) => e.message).join(', ')}`);
    }

    const fulfillmentService = result.data?.fulfillmentService;

    if (!fulfillmentService) {
      throw new Error('Fulfillment service not found in Shopify');
    }

    // Update company settings with the shared secret
    const updatedSettings = {
      ...company.settings,
      shopify: {
        ...shopifySettings,
        fulfillment_service: {
          ...shopifySettings.fulfillment_service,
          shared_secret: fulfillmentService.sharedSecret,
          callback_url: fulfillmentService.callbackUrl,
          updated_at: new Date().toISOString(),
        },
      },
    };

    const { error: updateError } = await supabase
      .from('companies')
      .update({ settings: updatedSettings })
      .eq('id', companyId);

    if (updateError) throw updateError;

    console.log('✅ Successfully fetched and stored fulfillment service secret');

    return new Response(
      JSON.stringify({
        success: true,
        fulfillmentService: {
          id: fulfillmentService.id,
          locationId: fulfillmentService.location.id,
          locationName: fulfillmentService.location.name,
          callbackUrl: fulfillmentService.callbackUrl,
          hasSharedSecret: !!fulfillmentService.sharedSecret,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error fetching fulfillment service secret:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShopifyGraphQLResponse {
  data?: {
    fulfillmentServiceCreate?: {
      fulfillmentService?: {
        id: string;
        location: {
          id: string;
          name: string;
        };
      };
      userErrors?: Array<{ field: string[]; message: string }>;
    };
  };
  errors?: Array<{ message: string }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { companyId, shopifySettings } = await req.json();

    if (!companyId || !shopifySettings?.access_token || !shopifySettings?.store_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Registering fulfillment service for company ${companyId}`);

    // Get callback URL for fulfillment order notifications
    const callbackUrl = `${supabaseUrl}/functions/v1/shopify-fulfillment-order-notification`;

    // GraphQL mutation to create fulfillment service
    const mutation = `
      mutation CreateFulfillmentService($callbackUrl: URL!) {
        fulfillmentServiceCreate(
          name: "Ship Tornado"
          callbackUrl: $callbackUrl
          trackingSupport: true
          inventoryManagement: false
          fulfillmentOrdersOptIn: true
        ) {
          fulfillmentService {
            id
            location {
              id
              name
            }
          }
          userErrors {
            field
            message
          }
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
        body: JSON.stringify({
          query: mutation,
          variables: { callbackUrl }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const result: ShopifyGraphQLResponse = await response.json();

    // Check for GraphQL errors
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error(`GraphQL error: ${result.errors.map(e => e.message).join(', ')}`);
    }

    // Check for user errors
    if (result.data?.fulfillmentServiceCreate?.userErrors?.length) {
      const errors = result.data.fulfillmentServiceCreate.userErrors;
      console.error('User errors:', errors);
      throw new Error(`Fulfillment service creation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    const fulfillmentService = result.data?.fulfillmentServiceCreate?.fulfillmentService;
    
    if (!fulfillmentService) {
      throw new Error('No fulfillment service returned from Shopify');
    }

    // Update company settings with fulfillment service info
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    if (fetchError) throw fetchError;

    const updatedSettings = {
      ...(company.settings || {}),
      shopify: {
        ...(company.settings?.shopify || {}),
        fulfillment_service: {
          id: fulfillmentService.id,
          location_id: fulfillmentService.location.id,
          location_name: fulfillmentService.location.name,
          registered_at: new Date().toISOString(),
          enabled: true,
        },
      },
    };

    const { error: updateError } = await supabase
      .from('companies')
      .update({ settings: updatedSettings })
      .eq('id', companyId);

    if (updateError) throw updateError;

    // Log success
    await supabase.from('shopify_sync_logs').insert({
      company_id: companyId,
      sync_type: 'fulfillment_service_registration',
      direction: 'outbound',
      status: 'success',
      metadata: {
        fulfillment_service_id: fulfillmentService.id,
        location_id: fulfillmentService.location.id,
        location_name: fulfillmentService.location.name,
      },
    });

    console.log('Fulfillment service registered successfully:', fulfillmentService);

    return new Response(
      JSON.stringify({
        success: true,
        fulfillmentService: {
          id: fulfillmentService.id,
          locationId: fulfillmentService.location.id,
          locationName: fulfillmentService.location.name,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error registering fulfillment service:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

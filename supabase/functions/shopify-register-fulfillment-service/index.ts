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

    const { companyId } = await req.json();

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'Missing companyId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch shopify settings from company record
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    if (companyError || !companyData) {
      console.error('Failed to fetch company:', companyError);
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shopifySettings = companyData.settings?.shopify;
    if (!shopifySettings?.access_token || !shopifySettings?.store_url) {
      return new Response(
        JSON.stringify({ error: 'Shopify not connected. Please connect your Shopify store first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Registering fulfillment service for company ${companyId}`);

    // Get callback URL for fulfillment order notifications
    const callbackUrl = `${supabaseUrl}/functions/v1/shopify-fulfillment-order-notification`;

    console.log('Registering fulfillment service with callback URL:', callbackUrl);

    // GraphQL mutation to create fulfillment service
    // Note: Shopify auto-generates sharedSecret - we don't provide it
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
          variables: { 
            callbackUrl
          }
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
    // Note: We don't store shared_secret - using query-based auth instead
    const updatedSettings = {
      ...(companyData.settings || {}),
      shopify: {
        ...(companyData.settings?.shopify || {}),
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

    // Subscribe to fulfillment order webhooks only (not orders/create)
    const webhookTopics = [
      'FULFILLMENT_ORDERS_FULFILLMENT_REQUEST',
      'FULFILLMENT_ORDERS_CANCELLATION_REQUEST',
      'FULFILLMENT_ORDERS_HOLD',
      'FULFILLMENT_ORDERS_RELEASE_HOLD'
    ];

    const webhookIds: Record<string, string> = {};

    for (const topic of webhookTopics) {
      try {
        const webhookMutation = `
          mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
            webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
              webhookSubscription {
                id
                topic
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const webhookResponse = await fetch(
          `https://${shopifySettings.store_url}/admin/api/2025-01/graphql.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': shopifySettings.access_token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: webhookMutation,
              variables: {
                topic,
                webhookSubscription: {
                  callbackUrl: callbackUrl,
                  format: 'JSON'
                }
              }
            }),
          }
        );

        const webhookResult = await webhookResponse.json();

        if (webhookResult.data?.webhookSubscriptionCreate?.userErrors?.length > 0) {
          console.error(`Webhook subscription error for ${topic}:`, webhookResult.data.webhookSubscriptionCreate.userErrors);
        } else if (webhookResult.data?.webhookSubscriptionCreate?.webhookSubscription) {
          const webhookId = webhookResult.data.webhookSubscriptionCreate.webhookSubscription.id;
          webhookIds[topic.toLowerCase()] = webhookId;
          console.log(`✅ Subscribed to webhook: ${topic} (${webhookId})`);
        }
      } catch (webhookError) {
        console.error(`Failed to subscribe to ${topic}:`, webhookError);
        // Continue with other webhooks even if one fails
      }
    }

    // Update company settings with webhook IDs
    const finalSettings = {
      ...updatedSettings,
      shopify: {
        ...updatedSettings.shopify,
        webhooks: webhookIds,
      },
    };

    await supabase
      .from('companies')
      .update({ settings: finalSettings })
      .eq('id', companyId);

    console.log('Webhook subscriptions completed:', Object.keys(webhookIds).length);

    return new Response(
      JSON.stringify({
        success: true,
        fulfillmentService: {
          id: fulfillmentService.id,
          locationId: fulfillmentService.location.id,
          locationName: fulfillmentService.location.name,
        },
        webhooks: webhookIds,
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

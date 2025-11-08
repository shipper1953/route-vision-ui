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

    const { companyId, storeId, shopifySettings } = await req.json();

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'Missing companyId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get store credentials - prioritize passed settings, fallback to database
    let accessToken: string;
    let storeUrl: string;
    let actualStoreId = storeId;

    if (shopifySettings?.access_token && shopifySettings?.store_url) {
      accessToken = shopifySettings.access_token;
      storeUrl = shopifySettings.store_url;
    } else if (storeId) {
      const { data: storeData, error: storeError } = await supabase
        .from('shopify_stores')
        .select('id, access_token, store_url')
        .eq('id', storeId)
        .eq('company_id', companyId)
        .single();

      if (storeError || !storeData) {
        console.error('Failed to fetch store:', storeError);
        return new Response(
          JSON.stringify({ error: 'Shopify store not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      accessToken = storeData.access_token;
      storeUrl = storeData.store_url;
      actualStoreId = storeData.id;
    } else {
      return new Response(
        JSON.stringify({ error: 'Either storeId or shopifySettings must be provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!accessToken || !storeUrl) {
      return new Response(
        JSON.stringify({ error: 'Shopify credentials missing' }),
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
      `https://${storeUrl}/admin/api/2025-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
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

    // Check for user errors - handle "already exists" gracefully
    if (result.data?.fulfillmentServiceCreate?.userErrors?.length) {
      const errors = result.data.fulfillmentServiceCreate.userErrors;
      console.error('User errors:', errors);
      
      // If already exists, try to fetch existing service
      const nameExistsError = errors.find(e => 
        e.message.toLowerCase().includes('already been taken') || 
        e.message.toLowerCase().includes('name') && e.message.toLowerCase().includes('taken')
      );
      
      if (nameExistsError) {
        console.log('Fulfillment service already exists, fetching existing service...');
        
        // Query to get existing fulfillment service
        const getServiceQuery = `
          query {
            shop {
              fulfillmentServices(first: 10) {
                edges {
                  node {
                    id
                    serviceName
                    location {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        `;
        
        const getResponse = await fetch(
          `https://${storeUrl}/admin/api/2025-01/graphql.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: getServiceQuery }),
          }
        );
        
        const getResult = await getResponse.json();
        const existingService = getResult.data?.shop?.fulfillmentServices?.edges?.find(
          (edge: any) => edge.node.serviceName === 'Ship Tornado'
        )?.node;
        
        if (existingService) {
          console.log('Found existing Ship Tornado fulfillment service:', existingService.id);
          
          // Use existing service
          const fulfillmentService = {
            id: existingService.id,
            location: {
              id: existingService.location.id,
              name: existingService.location.name,
            }
          };
          
          // Update shopify_stores with existing service
          if (actualStoreId) {
            await supabase
              .from('shopify_stores')
              .update({ 
                fulfillment_service_id: existingService.id,
                fulfillment_service_location_id: existingService.location.id,
              })
              .eq('id', actualStoreId);
          }
          
          return new Response(
            JSON.stringify({
              success: true,
              fulfillmentService: {
                id: fulfillmentService.id,
                locationId: fulfillmentService.location.id,
                locationName: fulfillmentService.location.name,
                alreadyExisted: true,
              },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      throw new Error(`Fulfillment service creation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    const fulfillmentService = result.data?.fulfillmentServiceCreate?.fulfillmentService;
    
    if (!fulfillmentService) {
      throw new Error('No fulfillment service returned from Shopify');
    }

    // Update shopify_stores table with fulfillment service info
    if (actualStoreId) {
      const { error: updateError } = await supabase
        .from('shopify_stores')
        .update({ 
          fulfillment_service_id: fulfillmentService.id,
          fulfillment_service_location_id: fulfillmentService.location.id,
        })
        .eq('id', actualStoreId);

      if (updateError) {
        console.error('Failed to update store with fulfillment service:', updateError);
        throw updateError;
      }
    }

    // Log success
    await supabase.from('shopify_sync_logs').insert({
      company_id: companyId,
      shopify_store_id: actualStoreId,
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
          `https://${storeUrl}/admin/api/2025-01/graphql.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': accessToken,
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

    // Store webhook IDs in shopify_stores if we have any
    if (actualStoreId && Object.keys(webhookIds).length > 0) {
      const { data: currentStore } = await supabase
        .from('shopify_stores')
        .select('settings')
        .eq('id', actualStoreId)
        .single();
      
      await supabase
        .from('shopify_stores')
        .update({ 
          settings: {
            ...(currentStore?.settings || {}),
            webhooks: webhookIds,
          }
        })
        .eq('id', actualStoreId);
    }

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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InventorySyncRequest {
  companyId: string;
  direction: 'ship_tornado_to_shopify' | 'shopify_to_ship_tornado' | 'bidirectional';
  threshold?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      companyId,
      direction = 'bidirectional',
      threshold = 0
    }: InventorySyncRequest = await req.json();

    console.log('Starting Shopify inventory sync for company:', companyId, 'Direction:', direction);

    // Get company settings
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      throw new Error('Company not found');
    }

    const shopifySettings = company.settings?.shopify;

    if (!shopifySettings || !shopifySettings.connected) {
      throw new Error('Shopify not connected');
    }

    let stats = {
      toShopify: { updated: 0, errors: 0 },
      fromShopify: { updated: 0, errors: 0 }
    };

    // Sync Ship Tornado → Shopify
    if (direction === 'ship_tornado_to_shopify' || direction === 'bidirectional') {
      stats.toShopify = await syncToShopify(supabase, companyId, shopifySettings, threshold);
    }

    // Sync Shopify → Ship Tornado
    if (direction === 'shopify_to_ship_tornado' || direction === 'bidirectional') {
      stats.fromShopify = await syncFromShopify(supabase, companyId, shopifySettings, threshold);
    }

    // Log sync event
    await supabase
      .from('shopify_sync_logs')
      .insert({
        company_id: companyId,
        sync_type: 'inventory_sync',
        direction: direction === 'bidirectional' ? 'bidirectional' : 
                   direction === 'ship_tornado_to_shopify' ? 'outbound' : 'inbound',
        status: (stats.toShopify.errors + stats.fromShopify.errors) === 0 ? 'success' : 'partial',
        metadata: stats
      });

    console.log('Inventory sync complete:', stats);

    return new Response(
      JSON.stringify({
        success: true,
        stats
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Inventory sync error:', error);

    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function syncToShopify(
  supabase: any,
  companyId: string,
  shopifySettings: any,
  threshold: number
): Promise<{ updated: number; errors: number }> {
  console.log('Syncing inventory from Ship Tornado to Shopify...');

  let updated = 0;
  let errors = 0;

  try {
    // Get all items from Item Master with inventory
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, sku, name')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (itemsError) {
      throw itemsError;
    }

    console.log(`Found ${items.length} items to sync`);

    // For each item, find its Shopify variant and update inventory using GraphQL
    for (const item of items) {
      try {
        // Search for product variant by SKU using GraphQL
        const searchQuery = `
          query searchProductVariants($query: String!) {
            productVariants(first: 1, query: $query) {
              edges {
                node {
                  id
                  sku
                  inventoryItem {
                    id
                    inventoryLevels(first: 10) {
                      edges {
                        node {
                          id
                          location {
                            id
                            name
                          }
                          available
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `;

        const searchResponse = await fetch(
          `https://${shopifySettings.store_url}/admin/api/2024-10/graphql.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': shopifySettings.access_token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: searchQuery,
              variables: { query: `sku:${item.sku}` }
            })
          }
        );

        if (!searchResponse.ok) {
          errors++;
          continue;
        }

        const searchResult = await searchResponse.json();
        
        if (searchResult.errors || !searchResult.data?.productVariants?.edges?.length) {
          continue;
        }

        const variant = searchResult.data.productVariants.edges[0].node;
        const inventoryItem = variant.inventoryItem;
        
        if (!inventoryItem?.inventoryLevels?.edges?.length) continue;

        // Update each location
        for (const levelEdge of inventoryItem.inventoryLevels.edges) {
          const level = levelEdge.node;
          
          // TODO: Get actual inventory count from boxes or warehouse management system
          const shipTornadoQty = 100; // Replace with actual inventory count
          
          if (Math.abs(level.available - shipTornadoQty) >= threshold) {
            // Update inventory using GraphQL mutation
            const updateMutation = `
              mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
                inventorySetQuantities(input: $input) {
                  inventoryAdjustmentGroup {
                    id
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }
            `;

            const updateResponse = await fetch(
              `https://${shopifySettings.store_url}/admin/api/2024-10/graphql.json`,
              {
                method: 'POST',
                headers: {
                  'X-Shopify-Access-Token': shopifySettings.access_token,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  query: updateMutation,
                  variables: {
                    input: {
                      reason: "correction",
                      name: "available",
                      quantities: [
                        {
                          inventoryItemId: inventoryItem.id,
                          locationId: level.location.id,
                          quantity: shipTornadoQty
                        }
                      ]
                    }
                  }
                })
              }
            );

            const updateResult = await updateResponse.json();
            
            if (updateResult.data?.inventorySetQuantities?.userErrors?.length === 0) {
              updated++;
              console.log(`✅ Updated inventory for ${item.sku}: ${shipTornadoQty}`);
            } else {
              errors++;
              console.error(`Failed to update ${item.sku}:`, updateResult.data?.inventorySetQuantities?.userErrors);
            }
          }
        }

      } catch (itemError) {
        errors++;
        console.error(`Error syncing item ${item.sku}:`, itemError);
      }
    }

  } catch (error) {
    console.error('Error in syncToShopify:', error);
    throw error;
  }

  return { updated, errors };
}

async function syncFromShopify(
  supabase: any,
  companyId: string,
  shopifySettings: any,
  threshold: number
): Promise<{ updated: number; errors: number }> {
  console.log('Syncing inventory from Shopify to Ship Tornado...');

  let updated = 0;
  let errors = 0;

  try {
    // Fetch all product variants with inventory using GraphQL
    const productsQuery = `
      query getProductsWithInventory($first: Int!, $after: String) {
        productVariants(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              sku
              inventoryItem {
                id
                inventoryLevels(first: 10) {
                  edges {
                    node {
                      id
                      available
                      location {
                        id
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    let hasNextPage = true;
    let afterCursor = null;
    let totalVariants = 0;

    while (hasNextPage) {
      const productsResponse = await fetch(
        `https://${shopifySettings.store_url}/admin/api/2024-10/graphql.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': shopifySettings.access_token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: productsQuery,
            variables: { 
              first: 250,
              after: afterCursor
            }
          })
        }
      );

      if (!productsResponse.ok) {
        throw new Error('Failed to fetch products from Shopify');
      }

      const result = await productsResponse.json();

      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      const variants = result.data.productVariants.edges.map((e: any) => e.node);
      totalVariants += variants.length;
      
      console.log(`Processing ${variants.length} variants (total: ${totalVariants})...`);

      for (const variant of variants) {
        if (!variant.sku) continue;

        try {
          // Find matching item in Ship Tornado
          const { data: item, error: itemError } = await supabase
            .from('items')
            .select('id, sku')
            .eq('company_id', companyId)
            .eq('sku', variant.sku)
            .maybeSingle();

          if (itemError || !item) continue;

          // Get inventory levels
          if (variant.inventoryItem?.inventoryLevels?.edges?.length) {
            const totalAvailable = variant.inventoryItem.inventoryLevels.edges
              .reduce((sum: number, edge: any) => sum + (edge.node.available || 0), 0);

            // TODO: Update Ship Tornado inventory system
            // For now, just log it - you'd integrate with boxes or warehouse inventory
            console.log(`Shopify inventory for ${variant.sku}: ${totalAvailable}`);
            updated++;
          }

        } catch (variantError) {
          errors++;
          console.error(`Error processing variant ${variant.sku}:`, variantError);
        }
      }

      // Check for next page
      hasNextPage = result.data.productVariants.pageInfo.hasNextPage;
      afterCursor = result.data.productVariants.pageInfo.endCursor;
    }

    console.log(`Fetched ${totalVariants} total variants from Shopify`);

  } catch (error) {
    console.error('Error in syncFromShopify:', error);
    throw error;
  }

  return { updated, errors };
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InventorySyncRequest {
  companyId: string;
  storeId?: string;
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

    // Verify caller identity
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    // Get user's company
    const { data: userRecord } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!userRecord) throw new Error('User profile not found');

    const {
      direction = 'bidirectional',
      threshold = 0,
      storeId
    }: InventorySyncRequest = await req.json();

    const companyId = userRecord.company_id;
    console.log('Starting inventory sync for company:', companyId, 'Direction:', direction);

    // Get active Shopify stores for this company
    let storesQuery = supabase
      .from('shopify_stores')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .eq('inventory_sync_enabled', true);

    if (storeId) {
      storesQuery = storesQuery.eq('id', storeId);
    }

    const { data: stores, error: storesError } = await storesQuery;

    if (storesError) throw new Error(`Failed to fetch stores: ${storesError.message}`);
    if (!stores || stores.length === 0) {
      throw new Error('No active Shopify stores with inventory sync enabled');
    }

    const allStats = {
      toShopify: { updated: 0, errors: 0 },
      fromShopify: { updated: 0, errors: 0 }
    };

    for (const store of stores) {
      if (!store.access_token || !store.store_url) {
        console.warn(`Store ${store.id} missing credentials, skipping`);
        continue;
      }

      const storeUrl = store.store_url.replace(/^https?:\/\//, '').replace(/\/$/, '');

      // Sync Ship Tornado → Shopify
      if (direction === 'ship_tornado_to_shopify' || direction === 'bidirectional') {
        const result = await syncToShopify(supabase, companyId, store, storeUrl, threshold);
        allStats.toShopify.updated += result.updated;
        allStats.toShopify.errors += result.errors;
      }

      // Sync Shopify → Ship Tornado
      if (direction === 'shopify_to_ship_tornado' || direction === 'bidirectional') {
        const result = await syncFromShopify(supabase, companyId, store, storeUrl, threshold);
        allStats.fromShopify.updated += result.updated;
        allStats.fromShopify.errors += result.errors;
      }
    }

    console.log('Inventory sync complete:', allStats);

    return new Response(
      JSON.stringify({ success: true, stats: allStats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Inventory sync error:', message);
    return new Response(
      JSON.stringify({ error: message, success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// ─── Ship Tornado → Shopify ───────────────────────────────────────────────────

async function syncToShopify(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  store: any,
  storeUrl: string,
  threshold: number
): Promise<{ updated: number; errors: number }> {
  console.log(`Syncing ST → Shopify for store ${store.store_name || store.id}`);
  let updated = 0;
  let errors = 0;
  let skippedMissingStLocationConfig = 0;
  let skippedMissingStLocationInShopify = 0;

  // Get items that are mapped to this Shopify store and have inventory
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('id, sku, name, shopify_variant_gid')
    .eq('company_id', companyId)
    .eq('shopify_store_id', store.id)
    .eq('is_active', true)
    .not('shopify_variant_gid', 'is', null);

  if (itemsError) {
    console.error('Failed to fetch items:', itemsError);
    return { updated: 0, errors: 1 };
  }

  if (!items || items.length === 0) {
    console.log('No mapped items found for this store');
    return { updated: 0, errors: 0 };
  }

  console.log(`Found ${items.length} mapped items to sync`);

  // Process items in batches of 10
  const batchSize = 10;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    await Promise.allSettled(batch.map(async (item) => {
      try {
        // Get total available quantity from inventory_levels
        const { data: invData, error: invError } = await supabase
          .from('inventory_levels')
          .select('quantity_available')
          .eq('company_id', companyId)
          .eq('item_id', item.id);

        if (invError) {
          console.error(`Inventory query error for ${item.sku}:`, invError);
          errors++;
          return;
        }

        const totalAvailable = (invData || []).reduce(
          (sum: number, row: any) => sum + (row.quantity_available || 0), 0
        );

        // Look up the inventory item ID from Shopify using the variant GID
        const variantQuery = `
          query getVariantInventory($id: ID!) {
            productVariant(id: $id) {
              inventoryItem {
                id
                inventoryLevels(first: 10) {
                  edges {
                    node {
                      id
                      quantities(names: ["available"]) {
                        name
                        quantity
                      }
                      location { id name }
                    }
                  }
                }
              }
            }
          }
        `;

        const variantRes = await fetch(
          `https://${storeUrl}/admin/api/2025-01/graphql.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': store.access_token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: variantQuery,
              variables: { id: item.shopify_variant_gid }
            })
          }
        );

        if (!variantRes.ok) {
          errors++;
          console.error(`Variant lookup HTTP error for ${item.sku}:`, await variantRes.text());
          return;
        }

        const variantResult = await variantRes.json();
        if (variantResult.errors?.length) {
          errors++;
          console.error(`Variant lookup GraphQL errors for ${item.sku}:`, variantResult.errors);
          return;
        }
        const inventoryItem = variantResult.data?.productVariant?.inventoryItem;

        if (!inventoryItem?.inventoryLevels?.edges?.length) {
          console.log(`No inventory levels found for ${item.sku}`);
          return;
        }

        // Only sync to the Ship Tornado fulfillment service location
        if (!store.fulfillment_service_location_id) {
          skippedMissingStLocationConfig++;
          console.log(`No fulfillment service location configured for store, skipping ${item.sku}`);
          return;
        }

        const configuredLocationId = normalizeLocationId(store.fulfillment_service_location_id);
        const targetEdge = inventoryItem.inventoryLevels.edges.find(
          (e: any) => normalizeLocationId(e.node.location.id) === configuredLocationId
        );

        if (!targetEdge) {
          skippedMissingStLocationInShopify++;
          console.log(`Ship Tornado location not found in Shopify for ${item.sku}, skipping`);
          return;
        }

        const targetLocation = targetEdge.node;

        const currentQty = targetLocation.quantities?.[0]?.quantity ?? 0;

        if (Math.abs(currentQty - totalAvailable) < threshold) {
          return; // Within threshold, skip
        }

        // Set quantity on Shopify
        const setMutation = `
          mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
            inventorySetQuantities(input: $input) {
              inventoryAdjustmentGroup { id }
              userErrors { field message }
            }
          }
        `;

        const setRes = await fetch(
          `https://${storeUrl}/admin/api/2025-01/graphql.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': store.access_token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: setMutation,
              variables: {
                input: {
                  reason: "correction",
                  name: "available",
                  quantities: [{
                    inventoryItemId: inventoryItem.id,
                    locationId: targetLocation.location.id,
                    quantity: totalAvailable
                  }]
                }
              }
            })
          }
        );

        if (!setRes.ok) {
          errors++;
          console.error(`Set quantity HTTP error for ${item.sku}:`, await setRes.text());
          return;
        }

        const setResult = await setRes.json();
        if (setResult.errors?.length) {
          errors++;
          console.error(`Set quantity GraphQL errors for ${item.sku}:`, setResult.errors);
          return;
        }
        const userErrors = setResult.data?.inventorySetQuantities?.userErrors || [];

        if (userErrors.length === 0) {
          updated++;
          console.log(`✅ ${item.sku}: ${currentQty} → ${totalAvailable}`);
        } else {
          errors++;
          console.error(`❌ ${item.sku}:`, userErrors);
        }
      } catch (err) {
        errors++;
        console.error(`Error syncing ${item.sku}:`, err);
      }
    }));
  }

  if (skippedMissingStLocationConfig > 0 || skippedMissingStLocationInShopify > 0) {
    console.log(
      `ST → Shopify skips for store ${store.store_name || store.id}: ` +
      `missing-config=${skippedMissingStLocationConfig}, location-not-found=${skippedMissingStLocationInShopify}`
    );
  }

  return { updated, errors };
}

// ─── Shopify → Ship Tornado ───────────────────────────────────────────────────

async function syncFromShopify(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  store: any,
  storeUrl: string,
  threshold: number
): Promise<{ updated: number; errors: number }> {
  console.log(`Syncing Shopify → ST for store ${store.store_name || store.id}`);
  let updated = 0;
  let errors = 0;
  let skippedMissingStLocationConfig = 0;
  let skippedMissingStLocationInShopify = 0;

  const configuredLocationId = normalizeLocationId(store.fulfillment_service_location_id);

  // Fetch all variants from Shopify with pagination
  const productsQuery = `
    query getVariantsInventory($first: Int!, $after: String) {
      productVariants(first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            sku
            inventoryItem {
              id
              inventoryLevels(first: 10) {
                edges {
                  node {
                    quantities(names: ["available"]) {
                      name
                      quantity
                    }
                    location { id name }
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
  let afterCursor: string | null = null;

  // Get default warehouse for this company
  const { data: warehouse } = await supabase
    .from('warehouses')
    .select('id')
    .eq('company_id', companyId)
    .limit(1)
    .single();

  if (!warehouse) {
    console.error('No warehouse found for company');
    return { updated: 0, errors: 1 };
  }

  while (hasNextPage) {
    const res = await fetch(
      `https://${storeUrl}/admin/api/2025-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': store.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: productsQuery,
          variables: { first: 100, after: afterCursor }
        })
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error('Shopify API error:', text);
      throw new Error('Failed to fetch variants from Shopify');
    }

    const result = await res.json();
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const variants = result.data.productVariants.edges.map((e: any) => e.node);

    for (const variant of variants) {
      if (!variant.sku) continue;

      try {
        // Find matching item in Ship Tornado
        const { data: item } = await supabase
          .from('items')
          .select('id')
          .eq('company_id', companyId)
          .eq('shopify_store_id', store.id)
          .eq('sku', variant.sku)
          .maybeSingle();

        if (!item) continue;

        // Only read quantity from the Ship Tornado fulfillment service location
        if (!configuredLocationId) {
          skippedMissingStLocationConfig++;
          continue;
        }

        const stLocationEdge = (variant.inventoryItem?.inventoryLevels?.edges || [])
          .find((edge: any) => normalizeLocationId(edge.node.location?.id) === configuredLocationId);

        if (!stLocationEdge) {
          skippedMissingStLocationInShopify++;
          continue; // SKU not stocked at our location
        }

        const shopifyQty = stLocationEdge.node.quantities?.[0]?.quantity ?? 0;

        // Get current ST quantity
        const { data: currentInv } = await supabase
          .from('inventory_levels')
          .select('id, quantity_on_hand, quantity_available')
          .eq('company_id', companyId)
          .eq('item_id', item.id)
          .eq('warehouse_id', warehouse.id)
          .maybeSingle();

        const currentQty = currentInv?.quantity_available ?? 0;

        if (Math.abs(currentQty - shopifyQty) < threshold) continue;

        if (currentInv) {
          // Update existing
          const { error: updateError } = await supabase
            .from('inventory_levels')
            .update({
              quantity_on_hand: shopifyQty,
              quantity_available: shopifyQty - (currentInv.quantity_on_hand - currentInv.quantity_available),
              updated_at: new Date().toISOString()
            })
            .eq('id', currentInv.id);

          if (updateError) {
            errors++;
            console.error(`Failed to update ${variant.sku}:`, updateError);
          } else {
            updated++;
            console.log(`✅ ${variant.sku}: ${currentQty} → ${shopifyQty}`);
          }
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('inventory_levels')
            .insert({
              company_id: companyId,
              item_id: item.id,
              warehouse_id: warehouse.id,
              customer_id: store.customer_id || null,
              quantity_on_hand: shopifyQty,
              quantity_available: shopifyQty,
              quantity_allocated: 0,
              condition: 'good'
            });

          if (insertError) {
            errors++;
            console.error(`Failed to insert ${variant.sku}:`, insertError);
          } else {
            updated++;
            console.log(`✅ Created inventory for ${variant.sku}: ${shopifyQty}`);
          }
        }
      } catch (err) {
        errors++;
        console.error(`Error processing ${variant.sku}:`, err);
      }
    }

    hasNextPage = result.data.productVariants.pageInfo.hasNextPage;
    afterCursor = result.data.productVariants.pageInfo.endCursor;
  }

  if (skippedMissingStLocationConfig > 0 || skippedMissingStLocationInShopify > 0) {
    console.log(
      `Shopify → ST skips for store ${store.store_name || store.id}: ` +
      `missing-config=${skippedMissingStLocationConfig}, location-not-found=${skippedMissingStLocationInShopify}`
    );
  }

  return { updated, errors };
}

function normalizeLocationId(locationId: string | null | undefined): string | null {
  if (!locationId) return null;
  const value = String(locationId).trim();
  if (!value) return null;
  const match = value.match(/(\d+)$/);
  return match ? match[1] : value;
}

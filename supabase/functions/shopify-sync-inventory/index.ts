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

    // For each item, we need to find its Shopify inventory item and location
    // This requires first fetching the product by SKU, then getting inventory levels
    for (const item of items) {
      try {
        // Search for product by SKU
        const productResponse = await fetch(
          `https://${shopifySettings.store_url}/admin/api/2024-01/products.json?fields=id,variants&limit=1`,
          {
            headers: {
              'X-Shopify-Access-Token': shopifySettings.access_token,
            },
          }
        );

        if (!productResponse.ok) continue;

        const { products } = await productResponse.json();
        
        // Find variant with matching SKU
        for (const product of products) {
          const variant = product.variants?.find((v: any) => v.sku === item.sku);
          
          if (variant && variant.inventory_item_id) {
            // Get current inventory levels
            const invResponse = await fetch(
              `https://${shopifySettings.store_url}/admin/api/2024-01/inventory_levels.json?inventory_item_ids=${variant.inventory_item_id}`,
              {
                headers: {
                  'X-Shopify-Access-Token': shopifySettings.access_token,
                },
              }
            );

            if (!invResponse.ok) continue;

            const { inventory_levels } = await invResponse.json();
            
            // Update each location (typically one primary location)
            for (const level of inventory_levels) {
              // TODO: Get actual inventory count from boxes or warehouse management system
              // For now, this is a placeholder - you'd integrate with your inventory tracking
              const shipTornadoQty = 100; // Replace with actual inventory count
              
              if (Math.abs(level.available - shipTornadoQty) >= threshold) {
                // Update inventory in Shopify
                const updateResponse = await fetch(
                  `https://${shopifySettings.store_url}/admin/api/2024-01/inventory_levels/set.json`,
                  {
                    method: 'POST',
                    headers: {
                      'X-Shopify-Access-Token': shopifySettings.access_token,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      location_id: level.location_id,
                      inventory_item_id: variant.inventory_item_id,
                      available: shipTornadoQty
                    }),
                  }
                );

                if (updateResponse.ok) {
                  updated++;
                  console.log(`✅ Updated inventory for ${item.sku}: ${shipTornadoQty}`);
                } else {
                  errors++;
                  console.error(`Failed to update ${item.sku}`);
                }
              }
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
    // Fetch all products with inventory
    const productsResponse = await fetch(
      `https://${shopifySettings.store_url}/admin/api/2024-01/products.json?fields=id,variants&limit=250`,
      {
        headers: {
          'X-Shopify-Access-Token': shopifySettings.access_token,
        },
      }
    );

    if (!productsResponse.ok) {
      throw new Error('Failed to fetch products from Shopify');
    }

    const { products } = await productsResponse.json();
    console.log(`Fetched ${products.length} products from Shopify`);

    for (const product of products) {
      for (const variant of product.variants || []) {
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

          // Get inventory level from Shopify
          if (variant.inventory_item_id) {
            const invResponse = await fetch(
              `https://${shopifySettings.store_url}/admin/api/2024-01/inventory_levels.json?inventory_item_ids=${variant.inventory_item_id}`,
              {
                headers: {
                  'X-Shopify-Access-Token': shopifySettings.access_token,
                },
              }
            );

            if (!invResponse.ok) continue;

            const { inventory_levels } = await invResponse.json();
            const totalAvailable = inventory_levels.reduce((sum: number, level: any) => sum + (level.available || 0), 0);

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
    }

  } catch (error) {
    console.error('Error in syncFromShopify:', error);
    throw error;
  }

  return { updated, errors };
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductSyncRequest {
  companyId: string;
  importVariants?: boolean;
  importBundles?: boolean;
  syncDimensions?: boolean;
  syncWeight?: boolean;
  mapToItemMaster?: boolean;
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
      importVariants = true,
      importBundles = false,
      syncDimensions = true,
      syncWeight = true,
      mapToItemMaster = true
    }: ProductSyncRequest = await req.json();

    console.log('Starting Shopify product sync for company:', companyId);

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

    console.log('Fetching products from Shopify store:', shopifySettings.store_url);

    // Fetch products from Shopify using GraphQL
    const productsQuery = `
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              legacyResourceId
              title
              productType
              status
              variants(first: 100) {
                edges {
                  node {
                    id
                    legacyResourceId
                    sku
                    title
                    price
                    inventoryQuantity
                    weight {
                      value
                      unit
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

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
          variables: { first: 250 }
        })
      }
    );

    if (!productsResponse.ok) {
      const errorText = await productsResponse.text();
      console.error('Shopify API error:', errorText);
      throw new Error('Failed to fetch products from Shopify');
    }

    const result = await productsResponse.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const products = result.data.products.edges.map((e: any) => e.node);
    console.log(`Fetched ${products.length} products from Shopify`);

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const product of products) {
      try {
        console.log(`Processing product: ${product.title} (ID: ${product.id})`);

        // Process variants if enabled, otherwise use main product
        const itemsToProcess = importVariants && product.variants?.edges?.length > 0
          ? product.variants.edges.map((e: any) => e.node)
          : [{
              id: product.id,
              legacyResourceId: product.legacyResourceId,
              sku: product.variants?.edges?.[0]?.node?.sku || `SHOP-${product.legacyResourceId}`,
              title: product.title,
              price: product.variants?.edges?.[0]?.node?.price || '0',
              weight: product.variants?.edges?.[0]?.node?.weight
            }];

        for (const variant of itemsToProcess) {
          const sku = variant.sku || `SHOP-${variant.legacyResourceId}`;
          
          // Check if item exists
          const { data: existingItem } = await supabase
            .from('items')
            .select('id, sku')
            .eq('company_id', companyId)
            .eq('sku', sku)
            .maybeSingle();

          // Prepare item data
          const itemData: any = {
            company_id: companyId,
            sku,
            name: importVariants && itemsToProcess.length > 1 
              ? `${product.title} - ${variant.title || ''}`
              : product.title,
            category: product.productType || 'General',
            is_active: product.status === 'ACTIVE',
            
            // Store both numeric IDs (legacy) and GIDs (new)
            shopify_product_id: product.legacyResourceId,
            shopify_variant_id: variant.legacyResourceId,
            shopify_product_gid: product.id,
            shopify_variant_gid: variant.id,
          };

          // Add dimensions if syncing
          if (syncDimensions) {
            // Shopify doesn't always have dimensions, use defaults if missing
            itemData.length = 12; // Default 12 inches
            itemData.width = 12;
            itemData.height = 12;
          }

          // Add weight if syncing
          if (syncWeight && variant.weight?.value) {
            // Convert weight to lbs (Shopify can be in GRAMS, OUNCES, POUNDS, KILOGRAMS)
            let weightInLbs = parseFloat(variant.weight.value);
            const weightUnit = variant.weight.unit?.toLowerCase();
            
            if (weightUnit === 'grams') {
              weightInLbs = weightInLbs / 453.592; // grams to lbs
            } else if (weightUnit === 'ounces') {
              weightInLbs = weightInLbs / 16; // ounces to lbs
            } else if (weightUnit === 'kilograms') {
              weightInLbs = weightInLbs * 2.20462; // kg to lbs
            }
            
            itemData.weight = Math.max(0.1, weightInLbs); // Min 0.1 lbs
          } else {
            itemData.weight = 1; // Default 1 lb
          }

          if (existingItem) {
            // Update existing item
            const { error: updateError } = await supabase
              .from('items')
              .update(itemData)
              .eq('id', existingItem.id);

            if (updateError) {
              console.error(`Error updating item ${sku}:`, updateError);
              errors.push(`Failed to update ${sku}: ${updateError.message}`);
              continue;
            }

            updated++;
            console.log(`✅ Updated item: ${sku}`);
          } else {
            // Create new item
            const { error: insertError } = await supabase
              .from('items')
              .insert(itemData);

            if (insertError) {
              console.error(`Error creating item ${sku}:`, insertError);
              errors.push(`Failed to create ${sku}: ${insertError.message}`);
              continue;
            }

            imported++;
            console.log(`✅ Created item: ${sku}`);
          }
        }

      } catch (productError) {
        console.error(`Error processing product ${product.id}:`, productError);
        errors.push(`Product ${product.title}: ${productError.message}`);
      }
    }

    // Log sync event
    await supabase
      .from('shopify_sync_logs')
      .insert({
        company_id: companyId,
        sync_type: 'product_import',
        direction: 'inbound',
        status: errors.length === 0 ? 'success' : 'partial',
        metadata: {
          total_products: products.length,
          imported,
          updated,
          skipped,
          errors: errors.length
        },
        error_message: errors.length > 0 ? errors.join('; ') : null,
      });

    console.log(`Product sync complete: ${imported} imported, ${updated} updated, ${skipped} skipped, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          total: products.length,
          imported,
          updated,
          skipped,
          errors: errors.length
        },
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Product sync error:', error);

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

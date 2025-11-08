import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// GraphQL helper for Shopify API calls
export async function shopifyGraphQL(
  shopifySettings: { store_url: string; access_token: string },
  query: string,
  variables: Record<string, any> = {}
) {
  const response = await fetch(
    `https://${shopifySettings.store_url}/admin/api/2025-01/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': shopifySettings.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify GraphQL API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result;
}

// Sanitization helper to prevent injection attacks
export function sanitizeString(str: string | null | undefined, maxLength: number = 255): string | null {
  if (!str) return null;
  return str.trim().slice(0, maxLength);
}

// Utility function to add business days (skip weekends)
export function addBusinessDays(startDate: Date, daysToAdd: number): Date {
  const result = new Date(startDate);
  let addedDays = 0;

  while (addedDays < daysToAdd) {
    result.setDate(result.getDate() + 1);
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++;
    }
  }

  return result;
}

type ItemMatch = {
  id: string;
  sku: string;
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  shopify_store_id?: string | null;
  shopify_variant_id?: string | null;
  shopify_product_id?: string | null;
  customer_id?: string | null;
};

async function findItem(
  supabase: SupabaseClient,
  filters: Record<string, string | number | boolean>
): Promise<ItemMatch | null> {
  let query = supabase
    .from('items')
    .select(
      'id, sku, name, length, width, height, weight, shopify_store_id, shopify_variant_id, shopify_product_id, customer_id'
    );

  for (const [column, value] of Object.entries(filters)) {
    query = query.eq(column, value);
  }

  const { data } = await query.maybeSingle();
  return data ?? null;
}

function belongsToCustomer(item: ItemMatch, customerId: string | null | undefined): boolean {
  if (!item.customer_id) return true;
  if (!customerId) return false;
  return item.customer_id === customerId;
}

function prepareUpdate(update: Record<string, string | null | undefined>): Record<string, string | null> {
  const payload: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(update)) {
    if (value !== undefined) {
      payload[key] = value;
    }
  }
  return payload;
}

function applyDetails(item: ItemMatch, update: Record<string, string | null>): ItemMatch {
  return { ...item, ...update };
}

// Helper function to find/create item with Shopify ID matching
export async function ensureItemExists(
  supabase: SupabaseClient,
  companyId: string,
  lineItem: any,
  shopifyStoreId?: string | null,
  customerId?: string | null
): Promise<{ id: string; details: ItemMatch }> {
  // PRIORITY 1: Try to match by variant_id (most specific)
  if (lineItem.variant_id) {
    if (shopifyStoreId) {
      const storeMatch = await findItem(supabase, {
        company_id: companyId,
        shopify_variant_id: lineItem.variant_id.toString(),
        shopify_store_id: shopifyStoreId,
      });

      if (storeMatch && belongsToCustomer(storeMatch, customerId)) {
        console.log(`✅ Matched by variant_id + store: ${lineItem.variant_id}`);

        const update = prepareUpdate({
          shopify_product_id: storeMatch.shopify_product_id || lineItem.product_id?.toString() || null,
          shopify_variant_id: storeMatch.shopify_variant_id || lineItem.variant_id?.toString() || null,
          customer_id: storeMatch.customer_id || customerId || null,
        });

        if (Object.keys(update).length > 0) {
          await supabase.from('items').update(update).eq('id', storeMatch.id);
        }

        return { id: storeMatch.id, details: applyDetails(storeMatch, update) };
      }
    }

    if (customerId) {
      const customerMatch = await findItem(supabase, {
        company_id: companyId,
        shopify_variant_id: lineItem.variant_id.toString(),
        customer_id: customerId,
      });

      if (customerMatch) {
        console.log(`✅ Matched by variant_id + customer: ${lineItem.variant_id}`);

        const update = prepareUpdate({
          shopify_product_id: customerMatch.shopify_product_id || lineItem.product_id?.toString() || null,
          shopify_variant_id: customerMatch.shopify_variant_id || lineItem.variant_id?.toString() || null,
          shopify_store_id: customerMatch.shopify_store_id || shopifyStoreId || null,
        });

        if (Object.keys(update).length > 0) {
          await supabase.from('items').update(update).eq('id', customerMatch.id);
        }

        return { id: customerMatch.id, details: applyDetails(customerMatch, update) };
      }
    }

    const variantMatch = await findItem(supabase, {
      company_id: companyId,
      shopify_variant_id: lineItem.variant_id.toString(),
    });

    if (variantMatch && belongsToCustomer(variantMatch, customerId)) {
      console.log(`✅ Matched by variant_id: ${lineItem.variant_id}`);

      const update = prepareUpdate({
        shopify_product_id: variantMatch.shopify_product_id || lineItem.product_id?.toString() || null,
        shopify_variant_id: variantMatch.shopify_variant_id || lineItem.variant_id?.toString() || null,
        shopify_store_id: variantMatch.shopify_store_id || shopifyStoreId || null,
        customer_id: variantMatch.customer_id || customerId || null,
      });

      if (Object.keys(update).length > 0) {
        await supabase.from('items').update(update).eq('id', variantMatch.id);
        console.log(`🔄 Backfilled Shopify IDs for item ${variantMatch.sku}`);
      }

      return { id: variantMatch.id, details: applyDetails(variantMatch, update) };
    }
  }

  // PRIORITY 2: Try to match by product_id
  if (lineItem.product_id) {
    if (shopifyStoreId) {
      const storeMatch = await findItem(supabase, {
        company_id: companyId,
        shopify_product_id: lineItem.product_id.toString(),
        shopify_store_id: shopifyStoreId,
      });

      if (storeMatch && belongsToCustomer(storeMatch, customerId)) {
        console.log(`✅ Matched by product_id + store: ${lineItem.product_id}`);

        const update = prepareUpdate({
          shopify_variant_id: storeMatch.shopify_variant_id || lineItem.variant_id?.toString() || null,
          customer_id: storeMatch.customer_id || customerId || null,
        });

        if (Object.keys(update).length > 0) {
          await supabase.from('items').update(update).eq('id', storeMatch.id);
        }

        return { id: storeMatch.id, details: applyDetails(storeMatch, update) };
      }
    }

    if (customerId) {
      const customerMatch = await findItem(supabase, {
        company_id: companyId,
        shopify_product_id: lineItem.product_id.toString(),
        customer_id: customerId,
      });

      if (customerMatch) {
        console.log(`✅ Matched by product_id + customer: ${lineItem.product_id}`);

        const update = prepareUpdate({
          shopify_variant_id: customerMatch.shopify_variant_id || lineItem.variant_id?.toString() || null,
          shopify_store_id: customerMatch.shopify_store_id || shopifyStoreId || null,
        });

        if (Object.keys(update).length > 0) {
          await supabase.from('items').update(update).eq('id', customerMatch.id);
        }

        return { id: customerMatch.id, details: applyDetails(customerMatch, update) };
      }
    }

    const productMatch = await findItem(supabase, {
      company_id: companyId,
      shopify_product_id: lineItem.product_id.toString(),
    });

    if (productMatch && belongsToCustomer(productMatch, customerId)) {
      console.log(`✅ Matched by product_id: ${lineItem.product_id}`);

      const update = prepareUpdate({
        shopify_variant_id: productMatch.shopify_variant_id || lineItem.variant_id?.toString() || null,
        shopify_store_id: productMatch.shopify_store_id || shopifyStoreId || null,
        customer_id: productMatch.customer_id || customerId || null,
      });

      if (Object.keys(update).length > 0) {
        await supabase.from('items').update(update).eq('id', productMatch.id);
        console.log(`🔄 Backfilled Shopify IDs for item ${productMatch.sku}`);
      }

      return { id: productMatch.id, details: applyDetails(productMatch, update) };
    }
  }

  // PRIORITY 3: Fallback to SKU matching
  if (lineItem.sku) {
    if (shopifyStoreId) {
      const storeMatch = await findItem(supabase, {
        company_id: companyId,
        sku: lineItem.sku,
        shopify_store_id: shopifyStoreId,
      });

      if (storeMatch && belongsToCustomer(storeMatch, customerId)) {
        console.log(`✅ Matched by SKU + store: ${lineItem.sku}`);

        const update = prepareUpdate({
          shopify_product_id: storeMatch.shopify_product_id || lineItem.product_id?.toString() || null,
          shopify_variant_id: storeMatch.shopify_variant_id || lineItem.variant_id?.toString() || null,
          customer_id: storeMatch.customer_id || customerId || null,
        });

        if (Object.keys(update).length > 0) {
          await supabase.from('items').update(update).eq('id', storeMatch.id);
        }

        return { id: storeMatch.id, details: applyDetails(storeMatch, update) };
      }
    }

    if (customerId) {
      const customerMatch = await findItem(supabase, {
        company_id: companyId,
        sku: lineItem.sku,
        customer_id: customerId,
      });

      if (customerMatch) {
        console.log(`✅ Matched by SKU + customer: ${lineItem.sku}`);

        const update = prepareUpdate({
          shopify_product_id: customerMatch.shopify_product_id || lineItem.product_id?.toString() || null,
          shopify_variant_id: customerMatch.shopify_variant_id || lineItem.variant_id?.toString() || null,
          shopify_store_id: customerMatch.shopify_store_id || shopifyStoreId || null,
        });

        if (Object.keys(update).length > 0) {
          await supabase.from('items').update(update).eq('id', customerMatch.id);
        }

        return { id: customerMatch.id, details: applyDetails(customerMatch, update) };
      }
    }

    const skuMatch = await findItem(supabase, {
      company_id: companyId,
      sku: lineItem.sku,
    });

    if (skuMatch && belongsToCustomer(skuMatch, customerId)) {
      console.log(`✅ Matched by SKU: ${lineItem.sku}`);

      const update = prepareUpdate({
        shopify_product_id: skuMatch.shopify_product_id || lineItem.product_id?.toString() || null,
        shopify_variant_id: skuMatch.shopify_variant_id || lineItem.variant_id?.toString() || null,
        shopify_store_id: skuMatch.shopify_store_id || shopifyStoreId || null,
        customer_id: skuMatch.customer_id || customerId || null,
      });

      if (Object.keys(update).length > 0) {
        await supabase.from('items').update(update).eq('id', skuMatch.id);
        console.log(`🔄 Backfilled Shopify IDs for item ${skuMatch.sku}`);
      }

      return { id: skuMatch.id, details: applyDetails(skuMatch, update) };
    }
  }

  // PRIORITY 4: Create new item
  console.log(
    `📦 Creating new item for product_id: ${lineItem.product_id}, variant_id: ${lineItem.variant_id}, store: ${shopifyStoreId}`
  );

  const sku = sanitizeString(lineItem.sku || `SHOP-${lineItem.variant_id || lineItem.product_id}`, 100);

  let weightInLbs = 0.125;
  if (lineItem.grams && lineItem.grams > 0) {
    weightInLbs = lineItem.grams / 453.592;
  }

  const itemData = {
    company_id: companyId,
    sku: sku,
    name: sanitizeString(lineItem.name || lineItem.title, 255),
    category: 'Shopify Product',
    is_active: true,
    length: 12,
    width: 12,
    height: 12,
    weight: weightInLbs,
    shopify_product_id: lineItem.product_id?.toString() || null,
    shopify_variant_id: lineItem.variant_id?.toString() || null,
    shopify_store_id: shopifyStoreId || null,
    customer_id: customerId || null,
  };

  const { data: newItem, error: itemError } = await supabase
    .from('items')
    .insert(itemData)
    .select(
      'id, sku, name, length, width, height, weight, shopify_store_id, customer_id, shopify_variant_id, shopify_product_id'
    )
    .single();

  if (itemError) {
    console.error('Error creating item:', itemError);
    throw new Error(`Failed to create item: ${itemError.message}`);
  }

  console.log(`✅ Created item: ${sku} with Shopify IDs (store: ${shopifyStoreId}, customer: ${customerId})`);
  return { id: newItem.id, details: newItem };
}

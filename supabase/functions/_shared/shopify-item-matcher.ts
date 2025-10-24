import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

// Helper function to find/create item with Shopify ID matching
export async function ensureItemExists(
  supabase: SupabaseClient,
  companyId: string,
  lineItem: any
): Promise<{ id: string; details: any }> {
  // PRIORITY 1: Try to match by variant_id (most specific)
  if (lineItem.variant_id) {
    const { data: variantMatch } = await supabase
      .from('items')
      .select('id, sku, name, length, width, height, weight')
      .eq('company_id', companyId)
      .eq('shopify_variant_id', lineItem.variant_id.toString())
      .maybeSingle();
    
    if (variantMatch) {
      console.log(`✅ Matched by variant_id: ${lineItem.variant_id}`);
      
      // Backfill Shopify IDs if missing
      if (!variantMatch.shopify_variant_id || !variantMatch.shopify_product_id) {
        await supabase
          .from('items')
          .update({
            shopify_product_id: lineItem.product_id?.toString() || null,
            shopify_variant_id: lineItem.variant_id?.toString() || null
          })
          .eq('id', variantMatch.id);
        console.log(`🔄 Backfilled Shopify IDs for item ${variantMatch.sku}`);
      }
      
      return { id: variantMatch.id, details: variantMatch };
    }
  }
  
  // PRIORITY 2: Try to match by product_id
  if (lineItem.product_id) {
    const { data: productMatch } = await supabase
      .from('items')
      .select('id, sku, name, length, width, height, weight')
      .eq('company_id', companyId)
      .eq('shopify_product_id', lineItem.product_id.toString())
      .maybeSingle();
    
    if (productMatch) {
      console.log(`✅ Matched by product_id: ${lineItem.product_id}`);
      
      // Backfill Shopify IDs if missing
      if (!productMatch.shopify_variant_id || !productMatch.shopify_product_id) {
        await supabase
          .from('items')
          .update({
            shopify_product_id: lineItem.product_id?.toString() || null,
            shopify_variant_id: lineItem.variant_id?.toString() || null
          })
          .eq('id', productMatch.id);
        console.log(`🔄 Backfilled Shopify IDs for item ${productMatch.sku}`);
      }
      
      return { id: productMatch.id, details: productMatch };
    }
  }
  
  // PRIORITY 3: Fallback to SKU matching
  if (lineItem.sku) {
    const { data: skuMatch } = await supabase
      .from('items')
      .select('id, sku, name, length, width, height, weight')
      .eq('company_id', companyId)
      .eq('sku', lineItem.sku)
      .maybeSingle();
    
    if (skuMatch) {
      console.log(`✅ Matched by SKU: ${lineItem.sku}`);
      
      // Backfill Shopify IDs if missing
      if (!skuMatch.shopify_variant_id || !skuMatch.shopify_product_id) {
        await supabase
          .from('items')
          .update({
            shopify_product_id: lineItem.product_id?.toString() || null,
            shopify_variant_id: lineItem.variant_id?.toString() || null
          })
          .eq('id', skuMatch.id);
        console.log(`🔄 Backfilled Shopify IDs for item ${skuMatch.sku}`);
      }
      
      return { id: skuMatch.id, details: skuMatch };
    }
  }
  
  // PRIORITY 4: Create new item
  console.log(`📦 Creating new item for product_id: ${lineItem.product_id}, variant_id: ${lineItem.variant_id}`);
  
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
    shopify_variant_id: lineItem.variant_id?.toString() || null
  };
  
  const { data: newItem, error: itemError } = await supabase
    .from('items')
    .insert(itemData)
    .select('id, sku, name, length, width, height, weight')
    .single();
  
  if (itemError) {
    console.error('Error creating item:', itemError);
    throw new Error(`Failed to create item: ${itemError.message}`);
  }
  
  console.log(`✅ Created item: ${sku} with Shopify IDs`);
  return { id: newItem.id, details: newItem };
}

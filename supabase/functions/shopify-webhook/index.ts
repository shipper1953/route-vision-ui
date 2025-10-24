import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { ShopifyOrderSchema, sanitizeString } from './validation.ts';
import { ZodError } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Utility function to add business days (skip weekends)
function addBusinessDays(startDate: Date, daysToAdd: number): Date {
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-shop-domain, x-shopify-topic',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get webhook headers
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256');
    const shopDomain = req.headers.get('x-shopify-shop-domain');
    const topic = req.headers.get('x-shopify-topic');

    console.log('Received Shopify webhook:', { shopDomain, topic });

    const rawBody = await req.text();
    const webhookData = JSON.parse(rawBody);
    
    // Validate webhook data for orders
    let validatedOrder;
    if (topic === 'orders/create' || topic === 'orders/updated') {
      try {
        validatedOrder = ShopifyOrderSchema.parse(webhookData);
      } catch (validationError) {
        console.error('Order validation failed:', validationError);
        if (validationError instanceof ZodError) {
          console.error('Validation errors:', validationError.errors);
        }
        throw new Error('Invalid order data from Shopify');
      }
    }

    // Find company with matching Shopify store domain
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('id, settings')
      .eq('is_active', true);

    if (companyError) {
      console.error('Error querying companies:', companyError);
      throw new Error('Database error');
    }

    // Find the company that has this Shopify store connected
    const company = companies?.find(c => {
      const shopifySettings = (c.settings as any)?.shopify;
      return shopifySettings?.connected && shopifySettings?.store_url === shopDomain;
    });

    if (!company) {
      console.error('No company found with Shopify store:', shopDomain);
      throw new Error(`No company connected to Shopify store: ${shopDomain}`);
    }

    const shopifySettings = (company.settings as any)?.shopify;
    const companyId = company.id;
    console.log('✅ Found company:', companyId, 'for shop:', shopDomain);

    // SECURITY: HMAC validation is MANDATORY
    if (!hmacHeader) {
      console.error('Missing HMAC signature header');
      throw new Error('Missing webhook signature - HMAC header required');
    }

    const apiSecret = Deno.env.get('SHOPIFY_API_SECRET') || shopifySettings.webhook_secret;
    if (!apiSecret) {
      console.error('SHOPIFY_API_SECRET not configured');
      throw new Error('Webhook secret not configured');
    }

    // Verify HMAC signature using Shopify API Secret
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
    const computedHmac = btoa(String.fromCharCode(...new Uint8Array(signature)));
    
    if (computedHmac !== hmacHeader) {
      console.error('HMAC verification failed - signature mismatch');
      throw new Error('Invalid webhook signature');
    }

    console.log('✅ HMAC signature verified successfully');

    // Handle orders/create webhook
    if (topic === 'orders/create') {
      const shopifyOrder = webhookData;
      
      // Check if order already exists
      const { data: existingMapping } = await supabase
        .from('shopify_order_mappings')
        .select('id')
        .eq('company_id', companyId)
        .eq('shopify_order_id', shopifyOrder.id.toString())
        .single();

      if (existingMapping) {
        console.log('Order already synced:', shopifyOrder.id);
        return new Response(JSON.stringify({ message: 'Order already synced' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Get default warehouse for company
      const { data: warehouse } = await supabase
        .from('warehouses')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_default', true)
        .single();

      // Helper function to find/create item with Shopify ID matching
      async function ensureItemExists(lineItem: any): Promise<{ id: string; details: any }> {
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

      // Process all line items with enhanced matching
      const mappedItems = [];
      let itemsMatched = 0;
      let itemsCreated = 0;

      for (const lineItem of shopifyOrder.line_items || []) {
        try {
          const { id: itemId, details } = await ensureItemExists(lineItem);
          
          // Track if we matched vs created
          if (details.shopify_variant_id === lineItem.variant_id?.toString() || 
              details.shopify_product_id === lineItem.product_id?.toString() ||
              details.sku === lineItem.sku) {
            itemsMatched++;
          } else {
            itemsCreated++;
          }
          
          mappedItems.push({
            itemId: itemId,
            sku: details.sku,
            name: sanitizeString(lineItem.name, 255),
            quantity: lineItem.quantity,
            unitPrice: parseFloat(lineItem.price),
            length: details.length,
            width: details.width,
            height: details.height,
            weight: details.weight
          });
          
        } catch (error) {
          console.error(`Failed to process line item:`, error);
          mappedItems.push({
            sku: sanitizeString(lineItem.sku || lineItem.name, 100),
            name: sanitizeString(lineItem.name, 255),
            quantity: lineItem.quantity,
            unitPrice: parseFloat(lineItem.price)
          });
        }
      }

      console.log(`📊 Item processing: ${itemsMatched} matched, ${itemsCreated} created`);

      // Transform Shopify order to Ship Tornado format with sanitization
      const orderData = {
        order_id: sanitizeString(`SHOP-${shopifyOrder.order_number}`, 50) || 'UNKNOWN',
        customer_name: sanitizeString(
          `${shopifyOrder.customer?.first_name || ''} ${shopifyOrder.customer?.last_name || ''}`.trim(),
          255
        ) || 'Unknown',
        customer_email: sanitizeString(shopifyOrder.customer?.email, 255),
        customer_phone: sanitizeString(shopifyOrder.customer?.phone, 20),
        customer_company: sanitizeString(shopifyOrder.customer?.company, 255),
        shipping_address: shopifyOrder.shipping_address ? {
          street1: sanitizeString(shopifyOrder.shipping_address.address1, 255) || '',
          street2: sanitizeString(shopifyOrder.shipping_address.address2, 255) || '',
          city: sanitizeString(shopifyOrder.shipping_address.city, 100) || '',
          state: sanitizeString(shopifyOrder.shipping_address.province_code, 10) || '',
          zip: sanitizeString(shopifyOrder.shipping_address.zip, 20) || '',
          country: sanitizeString(shopifyOrder.shipping_address.country_code, 2) || 'US'
        } : null,
        items: mappedItems,
        value: parseFloat(shopifyOrder.total_price || '0'),
        order_date: shopifyOrder.created_at,
        required_delivery_date: addBusinessDays(new Date(shopifyOrder.created_at), 5).toISOString().split('T')[0],
        status: 'ready_to_ship',
        company_id: companyId,
        warehouse_id: warehouse?.id || null,
        user_id: null, // Will be set by trigger
      };

      // Create order in Ship Tornado
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        throw orderError;
      }

      console.log('Created order:', newOrder.id);

      // Create mapping
      await supabase
        .from('shopify_order_mappings')
        .insert({
          company_id: companyId,
          ship_tornado_order_id: newOrder.id,
          shopify_order_id: shopifyOrder.id.toString(),
          shopify_order_number: shopifyOrder.order_number.toString(),
          sync_status: 'synced',
        });

      // Log sync event
      await supabase
        .from('shopify_sync_logs')
        .insert({
          company_id: companyId,
          sync_type: 'order_import',
          direction: 'inbound',
          status: 'success',
          shopify_order_id: shopifyOrder.id.toString(),
          ship_tornado_order_id: newOrder.id,
          metadata: { 
            order_number: shopifyOrder.order_number,
            total_items: mappedItems.length,
            items_matched: itemsMatched,
            items_created: itemsCreated,
            matching_method: 'shopify_ids'
          },
        });

      return new Response(JSON.stringify({ success: true, order_id: newOrder.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ message: 'Webhook received' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

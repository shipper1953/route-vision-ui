import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z, ZodError } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Sanitization helper to prevent injection attacks
function sanitizeString(str: string | null | undefined, maxLength: number = 255): string | null {
  if (!str) return null;
  return str.trim().slice(0, maxLength);
}

// Shopify webhook order validation schema
const ShopifyOrderSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  order_number: z.union([z.number(), z.string()]).transform(String),
  email: z.string().email().max(255).optional().nullable(),
  financial_status: z.string().max(50).optional(),
  fulfillment_status: z.string().max(50).optional().nullable(),
  total_price: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) : val
  ),
  currency: z.string().max(3).optional(),
  created_at: z.string().optional(),
  customer: z.object({
    id: z.union([z.number(), z.string()]).optional(),
    email: z.string().email().max(255).optional().nullable(),
    first_name: z.string().max(100).optional().nullable(),
    last_name: z.string().max(100).optional().nullable(),
    phone: z.string().max(20).optional().nullable(),
    company: z.string().max(255).optional().nullable()
  }).optional().nullable(),
  shipping_address: z.object({
    first_name: z.string().max(100).optional().nullable(),
    last_name: z.string().max(100).optional().nullable(),
    company: z.string().max(255).optional().nullable(),
    address1: z.string().max(255).optional().nullable(),
    address2: z.string().max(255).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    province: z.string().max(100).optional().nullable(),
    province_code: z.string().max(10).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
    country_code: z.string().max(2).optional().nullable(),
    zip: z.string().max(20).optional().nullable(),
    phone: z.string().max(20).optional().nullable()
  }).optional().nullable(),
  line_items: z.array(
    z.object({
      id: z.union([z.number(), z.string()]).optional(),
      product_id: z.union([z.number(), z.string()]).optional().nullable(),
      variant_id: z.union([z.number(), z.string()]).optional().nullable(),
      title: z.string().max(255),
      quantity: z.number().int().positive().max(10000),
      sku: z.string().max(100).optional().nullable(),
      name: z.string().max(255).optional().nullable(),
      vendor: z.string().max(255).optional().nullable(),
      price: z.union([z.string(), z.number()]).transform(val => 
        typeof val === 'string' ? parseFloat(val) : val
      ),
      requires_shipping: z.boolean().optional(),
      grams: z.number().optional(),
      properties: z.array(z.any()).optional()
    })
  ).optional().default([])
});

type ShopifyOrder = z.infer<typeof ShopifyOrderSchema>;

// Shopify Purchase Order webhook validation schema
const ShopifyPurchaseOrderSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  name: z.string().optional(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  expected_at: z.string().optional().nullable(),
  supplier: z.object({
    id: z.union([z.number(), z.string()]).optional(),
    name: z.string().optional(),
  }).optional().nullable(),
  destination: z.object({
    id: z.union([z.number(), z.string()]).optional(),
    name: z.string().optional(),
  }).optional().nullable(),
  line_items: z.array(
    z.object({
      id: z.union([z.number(), z.string()]),
      variant_id: z.union([z.number(), z.string()]).optional().nullable(),
      product_id: z.union([z.number(), z.string()]).optional().nullable(),
      quantity: z.number(),
      quantity_received: z.number().optional().default(0),
      sku: z.string().optional().nullable(),
      name: z.string().optional(),
      title: z.string().optional(),
      price: z.union([z.string(), z.number()]).optional().nullable(),
    })
  ).default([]),
  note: z.string().optional().nullable(),
});

// Shopify Inventory Transfer webhook validation schema
const ShopifyTransferSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  expected_at: z.string().optional().nullable(),
  origin_location: z.object({
    id: z.union([z.number(), z.string()]).optional(),
    name: z.string().optional(),
  }).optional().nullable(),
  destination_location: z.object({
    id: z.union([z.number(), z.string()]).optional(),
    name: z.string().optional(),
  }).optional().nullable(),
  line_items: z.array(
    z.object({
      id: z.union([z.number(), z.string()]),
      variant_id: z.union([z.number(), z.string()]).optional().nullable(),
      product_id: z.union([z.number(), z.string()]).optional().nullable(),
      quantity: z.number(),
      quantity_received: z.number().optional().default(0),
      product_title: z.string().optional(),
      title: z.string().optional(),
    })
  ).default([]),
});

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

// Helper functions for webhook processing
async function handlePurchaseOrderWebhook(supabase: any, webhookData: any, store: any, topic: string) {
  console.log(`Processing ${topic} for PO:`, webhookData.id);
  
  try {
    const validatedPO = ShopifyPurchaseOrderSchema.parse(webhookData);
    
    const { data: existingMapping } = await supabase
      .from('shopify_po_mappings')
      .select('ship_tornado_po_id')
      .eq('shopify_store_id', store.id)
      .eq('shopify_po_id', validatedPO.id)
      .single();
    
    const { data: warehouse } = await supabase
      .from('warehouses')
      .select('id')
      .eq('company_id', store.company_id)
      .eq('is_default', true)
      .single();
    
    if (!warehouse) throw new Error('No default warehouse found');
    
    const poData = {
      company_id: store.company_id,
      customer_id: store.customer_id || null,
      warehouse_id: warehouse.id,
      po_number: `SHOP-PO-${validatedPO.name || validatedPO.id}`,
      vendor_name: validatedPO.supplier?.name || 'Unknown Supplier',
      vendor_id: validatedPO.supplier?.id?.toString(),
      expected_date: validatedPO.expected_at ? new Date(validatedPO.expected_at).toISOString().split('T')[0] : null,
      status: mapShopifyPOStatus(validatedPO.status),
      notes: validatedPO.note || null,
      shopify_po_id: validatedPO.id,
      shopify_store_id: store.id,
      source_type: 'shopify_purchase_order',
      metadata: {
        shopify_created_at: validatedPO.created_at,
        shopify_updated_at: validatedPO.updated_at,
      },
    };
    
    let shipTornadoPoId: string;
    
    if (existingMapping) {
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update(poData)
        .eq('id', existingMapping.ship_tornado_po_id);
      
      if (updateError) throw updateError;
      shipTornadoPoId = existingMapping.ship_tornado_po_id;
    } else {
      const { data: newPO, error: insertError } = await supabase
        .from('purchase_orders')
        .insert(poData)
        .select('id')
        .single();
      
      if (insertError) throw insertError;
      shipTornadoPoId = newPO.id;
      
      await supabase.from('shopify_po_mappings').insert({
        company_id: store.company_id,
        shopify_store_id: store.id,
        shopify_po_id: validatedPO.id,
        shopify_po_number: validatedPO.name || validatedPO.id,
        ship_tornado_po_id: shipTornadoPoId,
        source_type: 'purchase_order',
      });
    }
    
    await syncPOLineItems(supabase, shipTornadoPoId, validatedPO.line_items, store.company_id);
    console.log(`✅ Successfully processed ${topic} for PO:`, validatedPO.id);
  } catch (error) {
    console.error('Error processing purchase order webhook:', error);
    throw error;
  }
}

async function handleTransferWebhook(supabase: any, webhookData: any, store: any, topic: string) {
  console.log(`Processing ${topic} for Transfer:`, webhookData.id);
  
  try {
    const validatedTransfer = ShopifyTransferSchema.parse(webhookData);
    
    const { data: existingMapping } = await supabase
      .from('shopify_po_mappings')
      .select('ship_tornado_po_id')
      .eq('shopify_store_id', store.id)
      .eq('shopify_po_id', validatedTransfer.id)
      .single();
    
    const { data: warehouse } = await supabase
      .from('warehouses')
      .select('id')
      .eq('company_id', store.company_id)
      .eq('is_default', true)
      .single();
    
    if (!warehouse) throw new Error('No default warehouse found');
    
    const poData = {
      company_id: store.company_id,
      customer_id: store.customer_id || null,
      warehouse_id: warehouse.id,
      po_number: `SHOP-TR-${validatedTransfer.id}`,
      vendor_name: 'Internal Transfer',
      vendor_id: validatedTransfer.origin_location?.id?.toString(),
      expected_date: validatedTransfer.expected_at ? new Date(validatedTransfer.expected_at).toISOString().split('T')[0] : null,
      status: mapShopifyTransferStatus(validatedTransfer.status),
      notes: `Transfer from ${validatedTransfer.origin_location?.name || 'Unknown'} to ${validatedTransfer.destination_location?.name || 'Unknown'}`,
      shopify_po_id: validatedTransfer.id,
      shopify_store_id: store.id,
      source_type: 'shopify_transfer',
      metadata: {
        shopify_created_at: validatedTransfer.created_at,
        shopify_updated_at: validatedTransfer.updated_at,
        origin_location: validatedTransfer.origin_location,
        destination_location: validatedTransfer.destination_location,
      },
    };
    
    let shipTornadoPoId: string;
    
    if (existingMapping) {
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update(poData)
        .eq('id', existingMapping.ship_tornado_po_id);
      
      if (updateError) throw updateError;
      shipTornadoPoId = existingMapping.ship_tornado_po_id;
    } else {
      const { data: newPO, error: insertError } = await supabase
        .from('purchase_orders')
        .insert(poData)
        .select('id')
        .single();
      
      if (insertError) throw insertError;
      shipTornadoPoId = newPO.id;
      
      await supabase.from('shopify_po_mappings').insert({
        company_id: store.company_id,
        shopify_store_id: store.id,
        shopify_po_id: validatedTransfer.id,
        shopify_po_number: validatedTransfer.id,
        ship_tornado_po_id: shipTornadoPoId,
        source_type: 'inventory_transfer',
      });
    }
    
    await syncTransferLineItems(supabase, shipTornadoPoId, validatedTransfer.line_items, store.company_id);
    console.log(`✅ Successfully processed ${topic} for Transfer:`, validatedTransfer.id);
  } catch (error) {
    console.error('Error processing transfer webhook:', error);
    throw error;
  }
}

async function syncPOLineItems(supabase: any, poId: string, lineItems: any[], companyId: string) {
  for (const lineItem of lineItems) {
    const { data: matchedItem } = await supabase
      .from('items')
      .select('id')
      .eq('company_id', companyId)
      .or(`sku.eq.${lineItem.sku || 'NONE'},shopify_variant_id.eq.${lineItem.variant_id || 'NONE'}`)
      .limit(1)
      .single();
    
    const lineItemData = {
      po_id: poId,
      item_id: matchedItem?.id || null,
      sku: lineItem.sku || lineItem.variant_id?.toString() || 'UNKNOWN',
      product_name: lineItem.name || lineItem.title || 'Unknown Product',
      quantity_ordered: lineItem.quantity || 0,
      quantity_received: lineItem.quantity_received || 0,
      unit_cost: lineItem.price ? parseFloat(lineItem.price.toString()) : null,
      uom: 'unit',
      shopify_line_item_id: lineItem.id?.toString(),
      metadata: {
        variant_id: lineItem.variant_id,
        product_id: lineItem.product_id,
      },
    };
    
    const { data: existingLineItem } = await supabase
      .from('po_line_items')
      .select('id')
      .eq('po_id', poId)
      .eq('shopify_line_item_id', lineItem.id?.toString())
      .single();
    
    if (existingLineItem) {
      await supabase
        .from('po_line_items')
        .update(lineItemData)
        .eq('id', existingLineItem.id);
    } else {
      await supabase
        .from('po_line_items')
        .insert(lineItemData);
    }
  }
}

async function syncTransferLineItems(supabase: any, poId: string, lineItems: any[], companyId: string) {
  for (const lineItem of lineItems) {
    const { data: matchedItem } = await supabase
      .from('items')
      .select('id, sku')
      .eq('company_id', companyId)
      .eq('shopify_variant_id', lineItem.variant_id?.toString())
      .limit(1)
      .single();
    
    const lineItemData = {
      po_id: poId,
      item_id: matchedItem?.id || null,
      sku: matchedItem?.sku || lineItem.variant_id?.toString() || 'UNKNOWN',
      product_name: lineItem.product_title || lineItem.title || 'Unknown Product',
      quantity_ordered: lineItem.quantity || 0,
      quantity_received: lineItem.quantity_received || 0,
      unit_cost: null,
      uom: 'unit',
      shopify_line_item_id: lineItem.id?.toString(),
      metadata: {
        variant_id: lineItem.variant_id,
        product_id: lineItem.product_id,
      },
    };
    
    const { data: existingLineItem } = await supabase
      .from('po_line_items')
      .select('id')
      .eq('po_id', poId)
      .eq('shopify_line_item_id', lineItem.id?.toString())
      .single();
    
    if (existingLineItem) {
      await supabase
        .from('po_line_items')
        .update(lineItemData)
        .eq('id', existingLineItem.id);
    } else {
      await supabase
        .from('po_line_items')
        .insert(lineItemData);
    }
  }
}

function mapShopifyPOStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'draft': 'pending',
    'open': 'pending',
    'received': 'received',
    'closed': 'closed',
    'cancelled': 'closed',
  };
  return statusMap[status] || 'pending';
}

function mapShopifyTransferStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'draft': 'pending',
    'pending': 'pending',
    'in_transit': 'pending',
    'received': 'received',
    'cancelled': 'closed',
  };
  return statusMap[status] || 'pending';
}

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

    // Find store by Shopify domain in shopify_stores table
    const { data: store, error: storeError } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('store_url', shopDomain)
      .eq('is_active', true)
      .single();

    if (storeError || !store) {
      console.error('No active store found for domain:', shopDomain);
      throw new Error(`No store connected with domain: ${shopDomain}`);
    }

    const companyId = store.company_id;
    const shopifyStoreId = store.id;
    console.log('✅ Found store:', shopifyStoreId, 'for company:', companyId);

    // SECURITY: HMAC validation is MANDATORY
    if (!hmacHeader) {
      console.error('Missing HMAC signature header');
      throw new Error('Missing webhook signature - HMAC header required');
    }

    const apiSecret = Deno.env.get('SHOPIFY_API_SECRET') || store.webhook_secret;
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

    // Route to appropriate handler based on topic
    switch (topic) {
      case 'purchase_orders/create':
      case 'purchase_orders/update':
        await handlePurchaseOrderWebhook(supabase, webhookData, store, topic);
        break;
        
      case 'inventory_transfers/create':
      case 'inventory_transfers/update':
        await handleTransferWebhook(supabase, webhookData, store, topic);
        break;
        
      case 'orders/create':
      case 'orders/updated':
        console.log('Order webhook received but not processed - using fulfillment webhooks instead');
        break;
        
      default:
        console.log('Unhandled webhook topic:', topic);
    }
    
    return new Response(JSON.stringify({ 
      message: 'Webhook processed successfully',
      topic,
      storeId: store.id 
    }), {
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

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface PurchaseOrderSyncRequest {
  companyId: string;
  storeId: string;
  dateRangeDays?: number;
  status?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { companyId, storeId, dateRangeDays = 90, status } = await req.json() as PurchaseOrderSyncRequest;

    console.log(`[PO Sync] Starting sync for company ${companyId}, store ${storeId}`);

    // Fetch Shopify store credentials
    const { data: store, error: storeError } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('id', storeId)
      .eq('company_id', companyId)
      .single();

    if (storeError || !store) {
      throw new Error(`Store not found: ${storeError?.message}`);
    }

    // Fetch default warehouse
    const { data: warehouse } = await supabase
      .from('warehouses')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_default', true)
      .single();

    if (!warehouse) {
      throw new Error('No default warehouse found');
    }

    // Clean and format store URL (remove https://, http://, trailing slashes)
    const shopifyUrl = store.store_url
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    const accessToken = store.access_token;

    console.log(`[PO Sync] Using store URL: https://${shopifyUrl}`);

    // Calculate date range
    const createdAtMin = new Date();
    createdAtMin.setDate(createdAtMin.getDate() - dateRangeDays);
    const createdAtMinStr = createdAtMin.toISOString();

    let purchaseOrders: any[] = [];
    let hasMore = true;
    let pageInfo = null;

    // Fetch purchase orders from Shopify
    while (hasMore) {
      const params = new URLSearchParams({
        limit: '250',
        created_at_min: createdAtMinStr,
        ...(status && { status }),
        ...(pageInfo && { page_info: pageInfo }),
      });

      const response = await fetch(
        `https://${shopifyUrl}/admin/api/2024-01/purchase_orders.json?${params}`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[PO Sync] Shopify API error - Status: ${response.status} ${response.statusText}`);
        console.error(`[PO Sync] Response body: ${errorBody}`);
        throw new Error(`Shopify API error (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();
      purchaseOrders = purchaseOrders.concat(data.purchase_orders || []);

      // Check for pagination
      const linkHeader = response.headers.get('Link');
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        if (match) {
          const url = new URL(match[1]);
          pageInfo = url.searchParams.get('page_info');
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`[PO Sync] Found ${purchaseOrders.length} purchase orders`);

    let created = 0;
    let updated = 0;
    let errors = 0;

    // Process each purchase order
    for (const shopifyPO of purchaseOrders) {
      try {
        // Check if PO already exists
        const { data: existingMapping } = await supabase
          .from('shopify_po_mappings')
          .select('ship_tornado_po_id')
          .eq('shopify_store_id', storeId)
          .eq('shopify_po_id', shopifyPO.id.toString())
          .single();

        const poData = {
          company_id: companyId,
          customer_id: store.customer_id || null,
          warehouse_id: warehouse.id,
          po_number: `SHOP-PO-${shopifyPO.name || shopifyPO.id}`,
          vendor_name: shopifyPO.supplier?.name || 'Unknown Supplier',
          vendor_id: shopifyPO.supplier?.id?.toString(),
          expected_date: shopifyPO.expected_at ? new Date(shopifyPO.expected_at).toISOString().split('T')[0] : null,
          status: mapShopifyPOStatus(shopifyPO.status),
          notes: shopifyPO.note || null,
          shopify_po_id: shopifyPO.id.toString(),
          shopify_store_id: storeId,
          source_type: 'shopify_purchase_order',
          metadata: {
            shopify_created_at: shopifyPO.created_at,
            shopify_updated_at: shopifyPO.updated_at,
            currency: shopifyPO.currency,
            total: shopifyPO.total,
          },
        };

        let shipTornadoPoId: string;

        if (existingMapping) {
          // Update existing PO
          const { error: updateError } = await supabase
            .from('purchase_orders')
            .update(poData)
            .eq('id', existingMapping.ship_tornado_po_id);

          if (updateError) throw updateError;
          
          shipTornadoPoId = existingMapping.ship_tornado_po_id;
          updated++;
          console.log(`[PO Sync] Updated PO ${shopifyPO.name}`);
        } else {
          // Create new PO
          const { data: newPO, error: insertError } = await supabase
            .from('purchase_orders')
            .insert(poData)
            .select('id')
            .single();

          if (insertError) throw insertError;
          
          shipTornadoPoId = newPO.id;

          // Create mapping
          await supabase.from('shopify_po_mappings').insert({
            company_id: companyId,
            shopify_store_id: storeId,
            shopify_po_id: shopifyPO.id.toString(),
            shopify_po_number: shopifyPO.name || shopifyPO.id.toString(),
            ship_tornado_po_id: shipTornadoPoId,
            source_type: 'purchase_order',
          });

          created++;
          console.log(`[PO Sync] Created PO ${shopifyPO.name}`);
        }

        // Sync line items
        if (shopifyPO.line_items && Array.isArray(shopifyPO.line_items)) {
          for (const lineItem of shopifyPO.line_items) {
            // Try to match item by SKU or Shopify variant ID
            const { data: matchedItem } = await supabase
              .from('items')
              .select('id')
              .eq('company_id', companyId)
              .or(`sku.eq.${lineItem.sku},shopify_variant_id.eq.${lineItem.variant_id}`)
              .limit(1)
              .single();

            const lineItemData = {
              po_id: shipTornadoPoId,
              item_id: matchedItem?.id || null,
              sku: lineItem.sku || lineItem.variant_id?.toString() || 'UNKNOWN',
              product_name: lineItem.name || lineItem.title || 'Unknown Product',
              quantity_ordered: lineItem.quantity || 0,
              quantity_received: lineItem.quantity_received || 0,
              unit_cost: lineItem.price ? parseFloat(lineItem.price) : null,
              uom: 'unit',
              shopify_line_item_id: lineItem.id?.toString(),
              metadata: {
                variant_id: lineItem.variant_id,
                product_id: lineItem.product_id,
              },
            };

            // Check if line item exists
            const { data: existingLineItem } = await supabase
              .from('po_line_items')
              .select('id')
              .eq('po_id', shipTornadoPoId)
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
      } catch (error) {
        console.error(`[PO Sync] Error processing PO ${shopifyPO.name}:`, error);
        errors++;
      }
    }

    console.log(`[PO Sync] Complete: ${created} created, ${updated} updated, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        total: purchaseOrders.length,
        created,
        updated,
        errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[PO Sync] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

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

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface TransferOrderSyncRequest {
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

    const { companyId, storeId, dateRangeDays = 90, status } = await req.json() as TransferOrderSyncRequest;

    console.log(`[Transfer Sync] Starting sync for company ${companyId}, store ${storeId}`);

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

    console.log(`[Transfer Sync] Using store URL: https://${shopifyUrl}`);

    // Calculate date range
    const createdAtMin = new Date();
    createdAtMin.setDate(createdAtMin.getDate() - dateRangeDays);
    const createdAtMinStr = createdAtMin.toISOString();

    let transfers: any[] = [];
    let hasMore = true;
    let pageInfo = null;

    // Fetch inventory transfers from Shopify
    while (hasMore) {
      const params = new URLSearchParams({
        limit: '250',
        created_at_min: createdAtMinStr,
        ...(status && { status }),
        ...(pageInfo && { page_info: pageInfo }),
      });

      const response = await fetch(
        `https://${shopifyUrl}/admin/api/2024-01/inventory_transfers.json?${params}`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[Transfer Sync] Shopify API error - Status: ${response.status} ${response.statusText}`);
        console.error(`[Transfer Sync] Response body: ${errorBody}`);
        throw new Error(`Shopify API error (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();
      transfers = transfers.concat(data.inventory_transfers || []);

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

    console.log(`[Transfer Sync] Found ${transfers.length} transfers`);

    let created = 0;
    let updated = 0;
    let errors = 0;

    // Process each transfer
    for (const transfer of transfers) {
      try {
        // Check if transfer already exists
        const { data: existingMapping } = await supabase
          .from('shopify_po_mappings')
          .select('ship_tornado_po_id')
          .eq('shopify_store_id', storeId)
          .eq('shopify_po_id', transfer.id.toString())
          .single();

        const poData = {
          company_id: companyId,
          customer_id: store.customer_id || null,
          warehouse_id: warehouse.id,
          po_number: `SHOP-TR-${transfer.id}`,
          vendor_name: 'Internal Transfer',
          vendor_id: transfer.origin_location?.id?.toString(),
          expected_date: transfer.expected_at ? new Date(transfer.expected_at).toISOString().split('T')[0] : null,
          status: mapShopifyTransferStatus(transfer.status),
          notes: `Transfer from ${transfer.origin_location?.name || 'Unknown'} to ${transfer.destination_location?.name || 'Unknown'}`,
          shopify_po_id: transfer.id.toString(),
          shopify_store_id: storeId,
          source_type: 'shopify_transfer',
          metadata: {
            shopify_created_at: transfer.created_at,
            shopify_updated_at: transfer.updated_at,
            origin_location: transfer.origin_location,
            destination_location: transfer.destination_location,
          },
        };

        let shipTornadoPoId: string;

        if (existingMapping) {
          // Update existing transfer PO
          const { error: updateError } = await supabase
            .from('purchase_orders')
            .update(poData)
            .eq('id', existingMapping.ship_tornado_po_id);

          if (updateError) throw updateError;
          
          shipTornadoPoId = existingMapping.ship_tornado_po_id;
          updated++;
          console.log(`[Transfer Sync] Updated transfer ${transfer.id}`);
        } else {
          // Create new transfer PO
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
            shopify_po_id: transfer.id.toString(),
            shopify_po_number: transfer.id.toString(),
            ship_tornado_po_id: shipTornadoPoId,
            source_type: 'inventory_transfer',
          });

          created++;
          console.log(`[Transfer Sync] Created transfer ${transfer.id}`);
        }

        // Sync line items
        if (transfer.line_items && Array.isArray(transfer.line_items)) {
          for (const lineItem of transfer.line_items) {
            // Try to match item by Shopify variant ID
            const { data: matchedItem } = await supabase
              .from('items')
              .select('id, sku')
              .eq('company_id', companyId)
              .eq('shopify_variant_id', lineItem.variant_id?.toString())
              .limit(1)
              .single();

            const lineItemData = {
              po_id: shipTornadoPoId,
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
        console.error(`[Transfer Sync] Error processing transfer ${transfer.id}:`, error);
        errors++;
      }
    }

    console.log(`[Transfer Sync] Complete: ${created} created, ${updated} updated, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        total: transfers.length,
        created,
        updated,
        errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Transfer Sync] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

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

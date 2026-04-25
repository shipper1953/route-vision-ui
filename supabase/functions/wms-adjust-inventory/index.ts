import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const body = await req.json();
    // Normalize empty strings to null (UUID columns reject "")
    const nz = (v: unknown) => (v === '' || v === undefined ? null : v);
    const company_id = nz(body.company_id);
    const item_id = nz(body.item_id);
    const warehouse_id = nz(body.warehouse_id);
    const location_id = nz(body.location_id);
    const quantity_change = Number(body.quantity_change ?? 0);
    const reason = body.reason ?? null;
    const notes = body.notes ?? null;
    const lot_number = nz(body.lot_number);
    const serial_number = nz(body.serial_number);
    const user_id = nz(body.user_id);

    if (!company_id || !item_id || !warehouse_id) {
      return new Response(
        JSON.stringify({ error: 'company_id, item_id and warehouse_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find or create inventory level
    let fetchQuery = supabaseClient
      .from('inventory_levels')
      .select('*')
      .eq('item_id', item_id)
      .eq('warehouse_id', warehouse_id);

    fetchQuery = location_id
      ? fetchQuery.eq('location_id', location_id)
      : fetchQuery.is('location_id', null);
    fetchQuery = lot_number
      ? fetchQuery.eq('lot_number', lot_number)
      : fetchQuery.is('lot_number', null);
    fetchQuery = serial_number
      ? fetchQuery.eq('serial_number', serial_number)
      : fetchQuery.is('serial_number', null);

    const { data: inventory, error: fetchError } = await fetchQuery.maybeSingle();

    if (fetchError) throw fetchError;

    let inventoryId: string;

    if (inventory) {
      const newQty = inventory.quantity_on_hand + quantity_change;
      
      if (newQty < 0) {
        return new Response(
          JSON.stringify({ error: 'Adjustment would result in negative inventory' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { error: updateError } = await supabaseClient
        .from('inventory_levels')
        .update({
          quantity_on_hand: newQty,
          quantity_available: Math.max(0, newQty - inventory.quantity_allocated),
          updated_at: new Date().toISOString()
        })
        .eq('id', inventory.id);

      if (updateError) throw updateError;
      inventoryId = inventory.id;
    } else {
      if (quantity_change < 0) {
        return new Response(
          JSON.stringify({ error: 'Cannot create inventory with negative quantity' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: newInventory, error: createError } = await supabaseClient
        .from('inventory_levels')
        .insert({
          company_id,
          item_id,
          warehouse_id,
          location_id,
          quantity_on_hand: quantity_change,
          quantity_available: quantity_change,
          quantity_allocated: 0,
          lot_number,
          serial_number,
          condition: 'good',
          received_date: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) throw createError;
      inventoryId = newInventory.id;
    }

    // Log the adjustment in inventory_transactions
    const { error: logError } = await supabaseClient
      .from('inventory_transactions')
      .insert({
        company_id,
        warehouse_id,
        transaction_type: 'adjust',
        item_id,
        to_location_id: location_id,
        quantity: quantity_change,
        reason_code: reason,
        notes,
        lot_number,
        serial_number,
        performed_by: user_id
      });

    if (logError) console.error('Failed to log adjustment:', logError);

    // Push the adjusted item's quantity to Shopify (Ship Tornado fulfillment service location)
    let shopifySync: { attempted: boolean; ok?: boolean; error?: string; sku?: string } = { attempted: false };
    try {
      shopifySync = await pushItemToShopify(supabaseClient, company_id as string, item_id as string);
    } catch (pushErr) {
      const msg = pushErr instanceof Error ? pushErr.message : String(pushErr);
      console.error('Shopify push after adjustment failed:', msg);
      shopifySync = { attempted: true, ok: false, error: msg };
    }

    return new Response(JSON.stringify({ success: true, shopifySync }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─── Shopify push helpers ─────────────────────────────────────────────────────

function normalizeLocationId(locationId: string | null | undefined): string | null {
  if (!locationId) return null;
  const value = String(locationId).trim();
  if (!value) return null;
  const match = value.match(/(\d+)$/);
  return match ? match[1] : value;
}

function normalizeFulfillmentServiceId(serviceId: string | null | undefined): string | null {
  if (!serviceId) return null;
  const value = String(serviceId).trim();
  if (!value) return null;
  if (value.startsWith('gid://shopify/FulfillmentService/')) return value;
  const match = value.match(/(\d+)$/);
  if (!match) return null;
  return `gid://shopify/FulfillmentService/${match[1]}`;
}

async function resolveFulfillmentServiceLocationId(store: any, storeUrl: string): Promise<string | null> {
  const configured = normalizeLocationId(store.fulfillment_service_location_id || null);
  if (configured) return configured;
  const fsId = normalizeFulfillmentServiceId(store.fulfillment_service_id || null);
  if (!fsId || !store?.access_token) return null;
  try {
    const res = await fetch(`https://${storeUrl}/admin/api/2025-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': store.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `query($id: ID!) { fulfillmentService(id: $id) { id location { id name } } }`,
        variables: { id: fsId },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return normalizeLocationId(json?.data?.fulfillmentService?.location?.id || null);
  } catch (_e) {
    return null;
  }
}

async function pushItemToShopify(
  _userClient: any,
  companyId: string,
  itemId: string
): Promise<{ attempted: boolean; ok?: boolean; error?: string; sku?: string; pushedQty?: number }> {
  // Use service-role for reading store credentials and writing logs.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Lookup item + Shopify mapping
  const { data: item, error: itemErr } = await admin
    .from('items')
    .select('id, sku, shopify_variant_gid, shopify_store_id, company_id, is_active')
    .eq('id', itemId)
    .maybeSingle();

  if (itemErr || !item) return { attempted: false, error: 'Item not found' };
  if (item.company_id !== companyId) return { attempted: false, error: 'Company mismatch' };
  if (!item.shopify_store_id || !item.shopify_variant_gid) {
    return { attempted: false, error: 'Item not linked to Shopify' };
  }

  // Get store
  const { data: store, error: storeErr } = await admin
    .from('shopify_stores')
    .select('*')
    .eq('id', item.shopify_store_id)
    .eq('is_active', true)
    .maybeSingle();

  if (storeErr || !store) return { attempted: false, error: 'Shopify store not found or inactive' };
  if (store.inventory_sync_enabled === false) {
    return { attempted: false, error: 'Inventory sync disabled for store' };
  }
  if (!store.access_token || !store.store_url) {
    return { attempted: false, error: 'Store missing credentials' };
  }

  const storeUrl = String(store.store_url).replace(/^https?:\/\//, '').replace(/\/$/, '');

  // Sum total available across all warehouses for this item
  const { data: invRows, error: invErr } = await admin
    .from('inventory_levels')
    .select('quantity_available')
    .eq('company_id', companyId)
    .eq('item_id', itemId);

  if (invErr) return { attempted: true, ok: false, error: invErr.message, sku: item.sku };
  const totalAvailable = (invRows || []).reduce(
    (sum: number, r: any) => sum + (r.quantity_available || 0),
    0
  );

  // Resolve Ship Tornado fulfillment service location id
  const fsLocationId = await resolveFulfillmentServiceLocationId(store, storeUrl);
  if (!fsLocationId) {
    return { attempted: true, ok: false, error: 'No Ship Tornado fulfillment-service location resolved', sku: item.sku };
  }

  // Find inventory item id + the matching location's gid
  const variantQuery = `
    query getVariantInventory($id: ID!) {
      productVariant(id: $id) {
        inventoryItem {
          id
          inventoryLevels(first: 250) {
            edges {
              node {
                id
                location { id name }
                quantities(names: ["available"]) { name quantity }
              }
            }
          }
        }
      }
    }
  `;

  const variantRes = await fetch(`https://${storeUrl}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': store.access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: variantQuery, variables: { id: item.shopify_variant_gid } }),
  });
  if (!variantRes.ok) {
    return { attempted: true, ok: false, error: `Variant lookup HTTP ${variantRes.status}`, sku: item.sku };
  }
  const variantJson = await variantRes.json();
  if (variantJson.errors?.length) {
    return { attempted: true, ok: false, error: `Variant GraphQL error: ${JSON.stringify(variantJson.errors)}`, sku: item.sku };
  }

  const inventoryItem = variantJson.data?.productVariant?.inventoryItem;
  const edges = inventoryItem?.inventoryLevels?.edges || [];
  const targetEdge = edges.find(
    (e: any) => normalizeLocationId(e?.node?.location?.id) === fsLocationId
  );
  if (!inventoryItem || !targetEdge) {
    return {
      attempted: true,
      ok: false,
      error: `Ship Tornado location ${fsLocationId} not present on variant in Shopify`,
      sku: item.sku,
    };
  }

  const targetLocationGid = targetEdge.node.location.id;

  const setRes = await fetch(`https://${storeUrl}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': store.access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) {
          inventoryAdjustmentGroup { id }
          userErrors { field message }
        }
      }`,
      variables: {
        input: {
          reason: 'correction',
          name: 'available',
          ignoreCompareQuantity: true,
          quantities: [{
            inventoryItemId: inventoryItem.id,
            locationId: targetLocationGid,
            quantity: totalAvailable,
          }],
        },
      },
    }),
  });

  if (!setRes.ok) {
    return { attempted: true, ok: false, error: `Set HTTP ${setRes.status}`, sku: item.sku };
  }
  const setJson = await setRes.json();
  const userErrors = setJson?.data?.inventorySetQuantities?.userErrors || [];
  if (setJson.errors?.length || userErrors.length) {
    return {
      attempted: true,
      ok: false,
      error: `Set errors: ${JSON.stringify(setJson.errors || userErrors)}`,
      sku: item.sku,
    };
  }

  console.log(`✅ Pushed ${item.sku} → ${totalAvailable} at location ${fsLocationId}`);
  return { attempted: true, ok: true, sku: item.sku, pushedQty: totalAvailable };
}

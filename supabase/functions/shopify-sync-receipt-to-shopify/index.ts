import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function normalizeLocationId(
  locationId: string | null | undefined,
): string | null {
  if (!locationId) return null;
  const value = String(locationId).trim();
  if (!value) return null;
  const match = value.match(/(\d+)$/);
  return match ? match[1] : value;
}

function normalizeFulfillmentServiceId(
  serviceId: string | null | undefined,
): string | null {
  if (!serviceId) return null;
  const value = String(serviceId).trim();
  if (!value) return null;
  if (value.startsWith("gid://shopify/FulfillmentService/")) return value;
  const match = value.match(/(\d+)$/);
  if (!match) return null;
  return `gid://shopify/FulfillmentService/${match[1]}`;
}

async function resolveFulfillmentServiceLocationId(
  store: any,
  storeUrl: string,
): Promise<string | null> {
  const configuredLocationId = normalizeLocationId(
    store.fulfillment_service_location_id || null,
  );
  if (configuredLocationId) return configuredLocationId;

  const fulfillmentServiceId = normalizeFulfillmentServiceId(
    store.fulfillment_service_id || null,
  );
  if (!fulfillmentServiceId || !store?.access_token) return null;

  try {
    const response = await fetch(
      `https://${storeUrl}/admin/api/2025-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": store.access_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            query getFulfillmentServiceLocation($id: ID!) {
              fulfillmentService(id: $id) {
                id
                location { id name }
              }
            }
          `,
          variables: { id: fulfillmentServiceId },
        }),
      },
    );
    if (!response.ok) return null;
    const result = await response.json();
    return normalizeLocationId(
      result?.data?.fulfillmentService?.location?.id || null,
    );
  } catch (_e) {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { transactionId, itemId } = await req.json();
    console.log("shopify-sync-receipt-to-shopify start", { transactionId, itemId });

    const recordError = async (msg: string) => {
      if (!transactionId) return;
      await supabase
        .from("inventory_transactions")
        .update({
          shopify_sync_error: msg,
          shopify_sync_at: new Date().toISOString(),
        })
        .eq("id", transactionId);
    };

    // Get item with Shopify mapping
    const { data: item, error: itemError } = await supabase
      .from("items")
      .select("id, sku, company_id, shopify_store_id, shopify_variant_gid, shopify_variant_id")
      .eq("id", itemId)
      .single();

    if (itemError || !item) {
      await recordError("Item not found");
      return new Response(
        JSON.stringify({ success: false, error: "Item not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 },
      );
    }

    if (!item.shopify_store_id || !item.shopify_variant_gid) {
      console.log("Item not linked to Shopify (missing store or variant gid), skipping");
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Item not linked to Shopify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get Shopify store credentials + fulfillment-service mapping
    const { data: store, error: storeError } = await supabase
      .from("shopify_stores")
      .select("id, store_url, access_token, fulfillment_service_location_id, fulfillment_service_id, store_name, inventory_sync_enabled, is_active")
      .eq("id", item.shopify_store_id)
      .single();

    if (storeError || !store || !store.is_active) {
      await recordError("Shopify store not found or inactive");
      return new Response(
        JSON.stringify({ success: false, error: "Shopify store not found or inactive" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 },
      );
    }

    if (store.inventory_sync_enabled === false) {
      console.log("Inventory sync disabled for store, skipping");
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Inventory sync disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const storeUrl = store.store_url.replace(/^https?:\/\//, "").replace(/\/$/, "");

    // Resolve Ship Tornado fulfillment-service location
    const fsLocationId = await resolveFulfillmentServiceLocationId(store, storeUrl);
    if (!fsLocationId) {
      const msg = "No Ship Tornado fulfillment-service location resolved for store";
      await recordError(msg);
      return new Response(
        JSON.stringify({ success: false, error: msg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Sum total available across all warehouses for this item (post-receipt)
    const { data: invRows, error: invError } = await supabase
      .from("inventory_levels")
      .select("quantity_available")
      .eq("company_id", item.company_id)
      .eq("item_id", item.id);

    if (invError) {
      await recordError(`Inventory query error: ${invError.message}`);
      return new Response(
        JSON.stringify({ success: false, error: invError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    const totalAvailable = (invRows || []).reduce(
      (sum: number, r: any) => sum + (r.quantity_available || 0),
      0,
    );

    // Look up inventory item GID + matching location level
    const variantQuery = `
      query getVariantInventory($id: ID!) {
        productVariant(id: $id) {
          inventoryItem {
            id
            inventoryLevels(first: 250) {
              edges {
                node {
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
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": store.access_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: variantQuery,
          variables: { id: item.shopify_variant_gid },
        }),
      },
    );

    const variantData = await variantRes.json();
    if (!variantRes.ok || variantData.errors?.length) {
      const msg = `Variant lookup failed: ${JSON.stringify(variantData.errors || variantData)}`;
      await recordError(msg);
      return new Response(
        JSON.stringify({ success: false, error: msg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    const inventoryItem = variantData.data?.productVariant?.inventoryItem;
    if (!inventoryItem?.id) {
      const msg = "Inventory item not found for variant";
      await recordError(msg);
      return new Response(
        JSON.stringify({ success: false, error: msg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 },
      );
    }

    const targetEdge = (inventoryItem.inventoryLevels?.edges || []).find(
      (e: any) => normalizeLocationId(e?.node?.location?.id) === fsLocationId,
    );
    if (!targetEdge) {
      const available = (inventoryItem.inventoryLevels?.edges || [])
        .map((e: any) => normalizeLocationId(e?.node?.location?.id))
        .filter(Boolean)
        .join(", ");
      const msg = `Ship Tornado fulfillment-service location ${fsLocationId} not in Shopify variant locations [${available}]`;
      await recordError(msg);
      return new Response(
        JSON.stringify({ success: false, error: msg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const targetLocationGid = targetEdge.node.location.id;

    // Set absolute on-hand
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
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": store.access_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: setMutation,
          variables: {
            input: {
              reason: "received",
              name: "available",
              ignoreCompareQuantity: true,
              quantities: [{
                inventoryItemId: inventoryItem.id,
                locationId: targetLocationGid,
                quantity: totalAvailable,
              }],
            },
          },
        }),
      },
    );

    const setData = await setRes.json();
    const userErrors = setData?.data?.inventorySetQuantities?.userErrors || [];
    if (!setRes.ok || setData.errors?.length || userErrors.length > 0) {
      const msg = `Set quantity failed: ${JSON.stringify(setData.errors || userErrors)}`;
      await recordError(msg);
      return new Response(
        JSON.stringify({ success: false, error: msg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    await supabase
      .from("inventory_transactions")
      .update({
        synced_to_shopify: true,
        shopify_sync_at: new Date().toISOString(),
        shopify_sync_error: null,
      })
      .eq("id", transactionId);

    console.log(`✅ Synced ${item.sku} to Shopify: ${totalAvailable} @ location ${fsLocationId}`);

    return new Response(
      JSON.stringify({ success: true, sku: item.sku, totalAvailable, locationId: fsLocationId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("shopify-sync-receipt-to-shopify error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

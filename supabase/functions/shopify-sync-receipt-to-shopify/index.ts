import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  const configured = normalizeLocationId(
    store.fulfillment_service_location_id || null,
  );
  if (configured) return configured;

  const fsId = normalizeFulfillmentServiceId(
    store.fulfillment_service_id || null,
  );
  if (!fsId || !store?.access_token) return null;

  try {
    const res = await fetch(
      `https://${storeUrl}/admin/api/2025-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": store.access_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query:
            `query($id: ID!){ fulfillmentService(id: $id){ location { id } } }`,
          variables: { id: fsId },
        }),
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return normalizeLocationId(
      json?.data?.fulfillmentService?.location?.id || null,
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
    // Use service role so we can read inventory_levels regardless of caller RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { transactionId, itemId } = await req.json();

    console.log("Syncing receipt to Shopify:", { transactionId, itemId });

    // Get item's Shopify mapping
    const { data: item, error: itemError } = await supabase
      .from("items")
      .select(
        "shopify_variant_gid, shopify_variant_id, shopify_store_id, company_id, sku",
      )
      .eq("id", itemId)
      .single();

    if (itemError || !item) {
      console.error("Item not found:", itemError);
      return new Response(
        JSON.stringify({ success: false, error: "Item not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    const variantGid = item.shopify_variant_gid ||
      (item.shopify_variant_id
        ? `gid://shopify/ProductVariant/${item.shopify_variant_id}`
        : null);

    if (!item.shopify_store_id || !variantGid) {
      console.log("Item not linked to Shopify, skipping sync");
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "Item not linked to Shopify",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get Shopify store credentials
    const { data: store, error: storeError } = await supabase
      .from("shopify_stores")
      .select("*")
      .eq("id", item.shopify_store_id)
      .eq("is_active", true)
      .single();

    if (storeError || !store) {
      console.error("Shopify store not found or inactive:", storeError);
      await supabase
        .from("inventory_transactions")
        .update({
          shopify_sync_error: "Shopify store not found or inactive",
          shopify_sync_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Shopify store not found or inactive",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    const storeUrl = String(store.store_url || "").replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

    const targetLocationId = await resolveFulfillmentServiceLocationId(
      store,
      storeUrl,
    );

    if (!targetLocationId) {
      const msg =
        "Ship Tornado fulfillment-service location could not be resolved for this store";
      console.error(msg);
      await supabase
        .from("inventory_transactions")
        .update({
          shopify_sync_error: msg,
          shopify_sync_at: new Date().toISOString(),
        })
        .eq("id", transactionId);
      return new Response(
        JSON.stringify({ success: false, error: msg }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Compute absolute quantity_available across all warehouses for this item
    const { data: invRows, error: invErr } = await supabase
      .from("inventory_levels")
      .select("quantity_available")
      .eq("company_id", item.company_id)
      .eq("item_id", itemId);
    if (invErr) {
      console.error("Failed reading inventory_levels:", invErr);
    }
    const totalAvailable = (invRows || []).reduce(
      (sum: number, r: any) => sum + (r.quantity_available || 0),
      0,
    );

    // Lookup inventory item id + the inventory level at the target location
    const variantQuery = `
      query getVariantInventory($id: ID!) {
        productVariant(id: $id) {
          inventoryItem {
            id
            inventoryLevels(first: 50) {
              edges {
                node {
                  quantities(names: ["available"]) { name quantity }
                  location { id }
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
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": store.access_token,
        },
        body: JSON.stringify({
          query: variantQuery,
          variables: { id: variantGid },
        }),
      },
    );

    const variantData = await variantRes.json();
    if (variantData.errors) {
      throw new Error(
        `Shopify variant lookup error: ${JSON.stringify(variantData.errors)}`,
      );
    }
    const inventoryItem = variantData.data?.productVariant?.inventoryItem;
    if (!inventoryItem?.id) {
      throw new Error("Inventory item not found for variant");
    }

    const targetEdge = (inventoryItem.inventoryLevels?.edges || []).find(
      (e: any) =>
        normalizeLocationId(e?.node?.location?.id) === targetLocationId,
    );

    if (!targetEdge) {
      const available = (inventoryItem.inventoryLevels?.edges || [])
        .map((e: any) => normalizeLocationId(e?.node?.location?.id))
        .filter(Boolean).join(", ");
      const msg =
        `Ship Tornado location ${targetLocationId} not stocked for variant in Shopify. Available: [${available}]`;
      console.error(msg);
      await supabase
        .from("inventory_transactions")
        .update({
          shopify_sync_error: msg,
          shopify_sync_at: new Date().toISOString(),
        })
        .eq("id", transactionId);
      return new Response(
        JSON.stringify({ success: false, error: msg }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

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
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": store.access_token,
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
                locationId: targetEdge.node.location.id,
                quantity: totalAvailable,
              }],
            },
          },
        }),
      },
    );

    const setData = await setRes.json();
    const userErrors = setData?.data?.inventorySetQuantities?.userErrors || [];
    if (setData.errors || userErrors.length) {
      const errorMsg = setData.errors
        ? JSON.stringify(setData.errors)
        : JSON.stringify(userErrors);
      console.error("Error setting inventory:", errorMsg);
      await supabase
        .from("inventory_transactions")
        .update({
          shopify_sync_error: errorMsg,
          shopify_sync_at: new Date().toISOString(),
        })
        .eq("id", transactionId);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to set Shopify inventory",
          details: errorMsg,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
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

    console.log(
      `✅ Receipt synced ${item.sku}: set Shopify available = ${totalAvailable}`,
    );

    return new Response(
      JSON.stringify({ success: true, quantity: totalAvailable }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error syncing to Shopify:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

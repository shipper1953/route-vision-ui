import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const asGid = (
  value: string | null | undefined,
  resource: string,
): string | null => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (raw.startsWith(`gid://shopify/${resource}/`)) return raw;
  const match = raw.match(/(\d+)$/);
  return match ? `gid://shopify/${resource}/${match[1]}` : raw;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    const { transactionId, itemId, quantityReceived, warehouseId } =
      await req.json();

    console.log("Syncing receipt to Shopify:", {
      transactionId,
      itemId,
      quantityReceived,
      warehouseId,
    });

    const { data: item, error: itemError } = await supabase
      .from("items")
      .select(
        "shopify_product_id, shopify_variant_id, shopify_variant_gid, shopify_store_id, company_id, sku",
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

    const variantGid =
      asGid(item.shopify_variant_gid, "ProductVariant") ||
      asGid(item.shopify_variant_id, "ProductVariant");

    if (!item.shopify_store_id || !variantGid) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "Item not linked to Shopify",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: store, error: storeError } = await supabase
      .from("shopify_stores")
      .select(
        "store_url, access_token, fulfillment_location_id, inventory_sync_enabled",
      )
      .eq("id", item.shopify_store_id)
      .eq("is_active", true)
      .single();

    if (storeError || !store) {
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

    if (store.inventory_sync_enabled === false) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "Inventory sync disabled for store",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: warehouse } = await supabase
      .from("warehouses")
      .select("shopify_location_id")
      .eq("id", warehouseId)
      .single();

    const shopifyLocationId =
      asGid(warehouse?.shopify_location_id, "Location") ||
      asGid(store.fulfillment_location_id, "Location");

    if (!shopifyLocationId) {
      await supabase
        .from("inventory_transactions")
        .update({
          shopify_sync_error: "No Shopify location mapped for warehouse",
          shopify_sync_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      return new Response(
        JSON.stringify({
          success: false,
          error: "No Shopify location mapped for warehouse",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const inventoryItemResponse = await fetch(
      `https://${store.store_url}/admin/api/2025-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": store.access_token,
        },
        body: JSON.stringify({
          query: `query GetInventoryItemId($variantId: ID!) { productVariant(id: $variantId) { id inventoryItem { id } } }`,
          variables: { variantId: variantGid },
        }),
      },
    );

    const inventoryItemData = await inventoryItemResponse.json();
    if (inventoryItemData.errors) {
      throw new Error(
        `Shopify API error: ${JSON.stringify(inventoryItemData.errors)}`,
      );
    }

    const inventoryItemId =
      inventoryItemData.data?.productVariant?.inventoryItem?.id;
    if (!inventoryItemId)
      throw new Error("Inventory item ID not found for variant");

    const { data: invRows, error: invError } = await supabase
      .from("inventory_levels")
      .select("quantity_available")
      .eq("company_id", item.company_id)
      .eq("item_id", itemId);

    if (invError)
      throw new Error(
        `Failed to calculate available quantity: ${invError.message}`,
      );

    const totalAvailable = (invRows || []).reduce(
      (sum: number, row: any) => sum + (row.quantity_available || 0),
      0,
    );

    const adjustResponse = await fetch(
      `https://${store.store_url}/admin/api/2025-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": store.access_token,
        },
        body: JSON.stringify({
          query: `mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
            inventorySetQuantities(input: $input) {
              inventoryAdjustmentGroup { id }
              userErrors { field message }
            }
          }`,
          variables: {
            input: {
              reason: "correction",
              name: "available",
              ignoreCompareQuantity: true,
              quantities: [
                {
                  inventoryItemId,
                  locationId: shopifyLocationId,
                  quantity: totalAvailable,
                },
              ],
            },
          },
        }),
      },
    );

    const adjustData = await adjustResponse.json();
    const userErrors =
      adjustData.data?.inventorySetQuantities?.userErrors || [];
    if (adjustData.errors || userErrors.length > 0) {
      const errorMsg = adjustData.errors
        ? JSON.stringify(adjustData.errors)
        : JSON.stringify(userErrors);

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
          error: "Failed to adjust Shopify inventory",
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

    return new Response(
      JSON.stringify({
        success: true,
        shopifyResponse: adjustData.data?.inventorySetQuantities,
        totalAvailable,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error syncing to Shopify:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

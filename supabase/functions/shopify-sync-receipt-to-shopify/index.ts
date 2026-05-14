import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    const {
      transactionId,
      itemId,
      quantityReceived,
      warehouseId,
      locationId,
    } = await req.json();

    console.log("Syncing receipt to Shopify:", {
      transactionId,
      itemId,
      quantityReceived,
    });

    // Get item's Shopify IDs and store info
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
        JSON.stringify({
          success: false,
          error: "Item not found",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    // If item not linked to Shopify, skip sync
    const variantGid = item.shopify_variant_gid || item.shopify_variant_id;

    if (!item.shopify_store_id || !variantGid) {
      console.log("Item not linked to Shopify, skipping sync");
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "Item not linked to Shopify",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get Shopify store credentials
    const { data: store, error: storeError } = await supabase
      .from("shopify_stores")
      .select("store_url, access_token, fulfillment_location_id")
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

    // Get warehouse's Shopify location mapping
    const { data: warehouse } = await supabase
      .from("warehouses")
      .select("shopify_location_id")
      .eq("id", warehouseId)
      .single();

    const shopifyLocationId = warehouse?.shopify_location_id ||
      store.fulfillment_location_id;

    if (!shopifyLocationId) {
      console.error("No Shopify location mapped for warehouse");
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

    // First, get the inventory item ID from the variant
    const getInventoryQuery = `
      query GetInventoryItemId($variantId: ID!) {
        productVariant(id: $variantId) {
          id
          inventoryItem {
            id
          }
        }
      }
    `;

    const inventoryItemResponse = await fetch(
      `https://${store.store_url}/admin/api/2025-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": store.access_token,
        },
        body: JSON.stringify({
          query: getInventoryQuery,
          variables: {
            variantId: variantGid,
          },
        }),
      },
    );

    const inventoryItemData = await inventoryItemResponse.json();

    if (inventoryItemData.errors) {
      console.error("Error getting inventory item:", inventoryItemData.errors);
      throw new Error(
        `Shopify API error: ${JSON.stringify(inventoryItemData.errors)}`,
      );
    }

    const inventoryItemId = inventoryItemData.data?.productVariant
      ?.inventoryItem?.id;

    if (!inventoryItemId) {
      throw new Error("Inventory item ID not found for variant");
    }

    // Set Shopify location quantity to current Ship Tornado total available for this item
    const { data: invRows, error: invError } = await supabase
      .from("inventory_levels")
      .select("quantity_available")
      .eq("company_id", item.company_id)
      .eq("item_id", itemId);

    if (invError) {
      throw new Error(`Failed to calculate available quantity: ${invError.message}`);
    }

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
              quantities: [{
                inventoryItemId: inventoryItemId,
                locationId: shopifyLocationId,
                quantity: totalAvailable,
              }],
            },
          },
        }),
      },
    );

    const adjustData = await adjustResponse.json();

    if (
      adjustData.errors ||
      adjustData.data?.inventorySetQuantities?.userErrors?.length > 0
    ) {
      const errorMsg = adjustData.errors
        ? JSON.stringify(adjustData.errors)
        : JSON.stringify(adjustData.data.inventorySetQuantities.userErrors);

      console.error("Error adjusting inventory:", errorMsg);

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

    // Mark transaction as synced
    await supabase
      .from("inventory_transactions")
      .update({
        synced_to_shopify: true,
        shopify_sync_at: new Date().toISOString(),
        shopify_sync_error: null,
      })
      .eq("id", transactionId);

    console.log("Successfully synced receipt to Shopify:", adjustData.data);

    return new Response(
      JSON.stringify({
        success: true,
        shopifyResponse: adjustData.data?.inventorySetQuantities,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error syncing to Shopify:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

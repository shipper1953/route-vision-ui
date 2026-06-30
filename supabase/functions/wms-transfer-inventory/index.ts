import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const nz = (value: unknown) => value === "" || value === undefined ? null : value;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("Unauthorized");

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const inventoryLevelId = nz(body.inventoryLevelId);
    const toLocationId = nz(body.toLocationId);
    const quantity = Number(body.quantity ?? 0);
    const notes = body.notes ?? null;
    const reasonCode = body.reasonCode ?? "bin_transfer";

    if (!inventoryLevelId || !toLocationId || !Number.isFinite(quantity) || quantity <= 0) {
      return new Response(JSON.stringify({ error: "inventoryLevelId, toLocationId and a positive quantity are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile?.company_id) throw new Error("User profile not found");

    const { data: source, error: sourceError } = await supabase
      .from("inventory_levels")
      .select("*")
      .eq("id", inventoryLevelId)
      .eq("company_id", userProfile.company_id)
      .single();

    if (sourceError || !source) throw new Error("Source inventory level not found");
    if (quantity > Number(source.quantity_available ?? source.quantity_on_hand ?? 0)) {
      return new Response(JSON.stringify({ error: "Transfer quantity exceeds available inventory" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: destinationLocation, error: destinationError } = await supabase
      .from("warehouse_locations")
      .select("id, warehouse_id, company_id, is_active")
      .eq("id", toLocationId)
      .eq("company_id", userProfile.company_id)
      .single();

    if (destinationError || !destinationLocation?.is_active) {
      throw new Error("Destination location not found or inactive");
    }

    if (destinationLocation.warehouse_id !== source.warehouse_id) {
      throw new Error("Cross-warehouse transfers are not supported by this workflow yet");
    }

    const newSourceOnHand = Number(source.quantity_on_hand ?? 0) - quantity;
    const newSourceAvailable = Number(source.quantity_available ?? 0) - quantity;

    const { error: sourceUpdateError } = await supabase
      .from("inventory_levels")
      .update({
        quantity_on_hand: newSourceOnHand,
        quantity_available: Math.max(0, newSourceAvailable),
        updated_at: new Date().toISOString(),
      })
      .eq("id", source.id);

    if (sourceUpdateError) throw sourceUpdateError;

    let destinationQuery = supabase
      .from("inventory_levels")
      .select("*")
      .eq("company_id", userProfile.company_id)
      .eq("warehouse_id", source.warehouse_id)
      .eq("location_id", toLocationId)
      .eq("item_id", source.item_id)
      .eq("condition", source.condition ?? "good");

    destinationQuery = source.lot_number ? destinationQuery.eq("lot_number", source.lot_number) : destinationQuery.is("lot_number", null);
    destinationQuery = source.serial_number ? destinationQuery.eq("serial_number", source.serial_number) : destinationQuery.is("serial_number", null);

    const { data: destination, error: destinationFetchError } = await destinationQuery.maybeSingle();
    if (destinationFetchError) throw destinationFetchError;

    if (destination) {
      const { error } = await supabase
        .from("inventory_levels")
        .update({
          quantity_on_hand: Number(destination.quantity_on_hand ?? 0) + quantity,
          quantity_available: Number(destination.quantity_available ?? 0) + quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", destination.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("inventory_levels")
        .insert({
          company_id: userProfile.company_id,
          warehouse_id: source.warehouse_id,
          location_id: toLocationId,
          item_id: source.item_id,
          customer_id: source.customer_id,
          quantity_on_hand: quantity,
          quantity_available: quantity,
          quantity_allocated: 0,
          lot_number: source.lot_number,
          serial_number: source.serial_number,
          expiry_date: source.expiry_date,
          condition: source.condition ?? "good",
          received_date: source.received_date ?? new Date().toISOString(),
        });
      if (error) throw error;
    }

    const { error: transactionError } = await supabase
      .from("inventory_transactions")
      .insert({
        company_id: userProfile.company_id,
        warehouse_id: source.warehouse_id,
        transaction_type: "transfer",
        item_id: source.item_id,
        from_location_id: source.location_id,
        to_location_id: toLocationId,
        quantity,
        reason_code: reasonCode,
        notes,
        lot_number: source.lot_number,
        serial_number: source.serial_number,
        performed_by: user.id,
      });

    if (transactionError) console.error("Failed to log transfer:", transactionError);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

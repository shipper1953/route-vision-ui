import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Row = {
  id: string;
  company_id: string;
  warehouse_id: string;
  item_id: string;
  customer_id: string | null;
  location_id: string | null;
  condition: string | null;
  lot_number: string | null;
  serial_number: string | null;
  quantity_on_hand: number | null;
  quantity_allocated: number | null;
  quantity_available: number | null;
  received_date: string | null;
  created_at: string;
};

// Dedup by SKU identity: same item + customer + condition + lot/serial.
// Warehouse and location are intentionally excluded so cross-warehouse
// duplicates of the same SKU collapse into a single row (the earliest one wins).
const keyOf = (r: Row) =>
  [
    r.item_id,
    r.customer_id ?? "",
    r.condition ?? "",
    r.lot_number ?? "",
    r.serial_number ?? "",
  ].join("|");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Auth: derive user/company from JWT
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: profile, error: profileErr } = await admin
      .from("users")
      .select("company_id, role")
      .eq("id", userData.user.id)
      .single();
    if (profileErr || !profile?.company_id) {
      return new Response(
        JSON.stringify({ error: "No company on user profile" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const isSuperAdmin = profile.role === "super_admin";
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;
    // Super admin can scope; others always restricted to their company.
    const companyScope: string | null = isSuperAdmin
      ? (typeof body?.companyId === "string" ? body.companyId : null)
      : profile.company_id;

    let q = admin
      .from("inventory_levels")
      .select(
        "id, company_id, warehouse_id, item_id, customer_id, location_id, condition, lot_number, serial_number, quantity_on_hand, quantity_allocated, quantity_available, received_date, created_at",
      )
      .order("created_at", { ascending: true });

    if (companyScope) q = q.eq("company_id", companyScope);

    const { data: rows, error: fetchErr } = await q;
    if (fetchErr) throw fetchErr;

    // Group by company + dedup key
    const groups = new Map<string, Row[]>();
    for (const r of (rows || []) as Row[]) {
      const gk = `${r.company_id}::${keyOf(r)}`;
      const arr = groups.get(gk) || [];
      arr.push(r);
      groups.set(gk, arr);
    }

    const merges: Array<{
      keptId: string;
      mergedIds: string[];
      itemId: string;
      totalOnHand: number;
      totalAllocated: number;
    }> = [];

    for (const [, list] of groups) {
      if (list.length < 2) continue;
      // Keep the earliest received/created row
      list.sort((a, b) => {
        const ad = new Date(a.received_date || a.created_at).getTime();
        const bd = new Date(b.received_date || b.created_at).getTime();
        return ad - bd;
      });
      const keep = list[0];
      const dupes = list.slice(1);

      const totalOnHand = list.reduce(
        (s, r) => s + (r.quantity_on_hand || 0),
        0,
      );
      const totalAllocated = list.reduce(
        (s, r) => s + (r.quantity_allocated || 0),
        0,
      );
      const totalAvailable = Math.max(totalOnHand - totalAllocated, 0);

      merges.push({
        keptId: keep.id,
        mergedIds: dupes.map((d) => d.id),
        itemId: keep.item_id,
        totalOnHand,
        totalAllocated,
      });

      if (dryRun) continue;

      // Delete dupes first (to free unique constraints / avoid double-counting on triggers)
      const { error: delErr } = await admin
        .from("inventory_levels")
        .delete()
        .in("id", dupes.map((d) => d.id));
      if (delErr) throw delErr;

      // Then update the kept row to the consolidated totals
      const { error: updErr } = await admin
        .from("inventory_levels")
        .update({
          quantity_on_hand: totalOnHand,
          quantity_allocated: totalAllocated,
          quantity_available: totalAvailable,
          updated_at: new Date().toISOString(),
        })
        .eq("id", keep.id);
      if (updErr) throw updErr;

      // Audit log
      await admin.from("inventory_transactions").insert({
        company_id: keep.company_id,
        warehouse_id: keep.warehouse_id,
        item_id: keep.item_id,
        inventory_level_id: keep.id,
        location_id: keep.location_id,
        lot_number: keep.lot_number,
        serial_number: keep.serial_number,
        transaction_type: "reconcile_merge",
        quantity_change: 0,
        quantity_on_hand_after: totalOnHand,
        quantity_allocated_after: totalAllocated,
        reason_code: "duplicate_merge",
        source: "reconcile",
        performed_by: userData.user.id,
        notes: `Merged ${dupes.length} duplicate row(s) into ${keep.id}`,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        dryRun,
        scannedRows: rows?.length || 0,
        duplicateGroups: merges.length,
        mergedRows: merges.reduce((s, m) => s + m.mergedIds.length, 0),
        merges,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("reconcile error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

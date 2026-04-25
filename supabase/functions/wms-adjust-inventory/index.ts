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

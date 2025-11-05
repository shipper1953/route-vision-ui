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

    const {
      company_id,
      item_id,
      warehouse_id,
      location_id,
      quantity_change,
      reason,
      notes,
      lot_number,
      serial_number,
      user_id
    } = await req.json();

    // Find or create inventory level
    const { data: inventory, error: fetchError } = await supabaseClient
      .from('inventory_levels')
      .select('*')
      .eq('item_id', item_id)
      .eq('warehouse_id', warehouse_id)
      .eq('location_id', location_id)
      .eq('lot_number', lot_number || '')
      .eq('serial_number', serial_number || '')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

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
          quantity_available: Math.max(0, newQty - inventory.quantity_allocated)
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
          lot_number,
          serial_number
        })
        .select()
        .single();

      if (createError) throw createError;
      inventoryId = newInventory.id;
    }

    // Log the adjustment
    const { error: logError } = await supabaseClient
      .from('inventory_adjustments')
      .insert({
        company_id,
        inventory_level_id: inventoryId,
        item_id,
        warehouse_id,
        location_id,
        quantity_change,
        reason,
        notes,
        lot_number,
        serial_number,
        adjusted_by: user_id
      });

    if (logError) console.error('Failed to log adjustment:', logError);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

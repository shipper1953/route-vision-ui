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
      .is('lot_number', lot_number || null)
      .is('serial_number', serial_number || null)
      .maybeSingle();

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

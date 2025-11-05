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
      pick_list_id,
      item_id,
      quantity_picked,
      lot_number,
      serial_number,
      user_id
    } = await req.json();

    // Find the pick list item
    const { data: pickListItem, error: fetchError } = await supabaseClient
      .from('pick_list_items')
      .select('*, pick_lists(warehouse_id, company_id)')
      .eq('pick_list_id', pick_list_id)
      .eq('item_id', item_id)
      .single();

    if (fetchError) throw fetchError;

    // Update pick list item
    const newQuantityPicked = pickListItem.quantity_picked + quantity_picked;
    
    const { error: updateError } = await supabaseClient
      .from('pick_list_items')
      .update({
        quantity_picked: newQuantityPicked,
        picked_by: user_id,
        picked_at: new Date().toISOString()
      })
      .eq('id', pickListItem.id);

    if (updateError) throw updateError;

    // Find and update inventory
    const { data: inventory, error: inventoryError } = await supabaseClient
      .from('inventory_levels')
      .select('*')
      .eq('item_id', item_id)
      .eq('warehouse_id', pickListItem.pick_lists.warehouse_id)
      .eq('location_id', pickListItem.location_id)
      .eq('lot_number', lot_number || '')
      .eq('serial_number', serial_number || '')
      .single();

    if (inventoryError) throw inventoryError;

    // Deallocate from inventory (picked items are no longer allocated)
    const { error: deallocationError } = await supabaseClient
      .from('inventory_levels')
      .update({
        quantity_allocated: Math.max(0, inventory.quantity_allocated - quantity_picked),
        quantity_on_hand: Math.max(0, inventory.quantity_on_hand - quantity_picked)
      })
      .eq('id', inventory.id);

    if (deallocationError) throw deallocationError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error picking item:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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
      session_id,
      po_line_id,
      item_id,
      quantity_received,
      location_id,
      lot_number,
      serial_number,
      condition,
      expiry_date,
      user_id
    } = await req.json();

    // Insert receiving line item
    const { data: lineItem, error: lineError } = await supabaseClient
      .from('receiving_line_items')
      .insert({
        session_id,
        po_line_id,
        item_id,
        quantity_received,
        location_id,
        lot_number,
        serial_number,
        condition: condition || 'good',
        expiry_date,
        received_by: user_id
      })
      .select()
      .single();

    if (lineError) throw lineError;

    // Update PO line item received quantity
    const { error: poUpdateError } = await supabaseClient.rpc('increment_po_received_qty', {
      p_po_line_id: po_line_id,
      p_quantity: quantity_received
    });

    if (poUpdateError) console.error('Failed to update PO qty:', poUpdateError);

    // Update or create inventory level
    const { data: session } = await supabaseClient
      .from('receiving_sessions')
      .select('company_id, warehouse_id')
      .eq('id', session_id)
      .single();

    if (session) {
      const { data: existingInventory } = await supabaseClient
        .from('inventory_levels')
        .select('id, quantity_on_hand')
        .eq('item_id', item_id)
        .eq('warehouse_id', session.warehouse_id)
        .eq('location_id', location_id)
        .eq('lot_number', lot_number || '')
        .eq('serial_number', serial_number || '')
        .single();

      if (existingInventory) {
        await supabaseClient
          .from('inventory_levels')
          .update({
            quantity_on_hand: existingInventory.quantity_on_hand + quantity_received,
            quantity_available: existingInventory.quantity_on_hand + quantity_received
          })
          .eq('id', existingInventory.id);
      } else {
        await supabaseClient
          .from('inventory_levels')
          .insert({
            company_id: session.company_id,
            item_id,
            warehouse_id: session.warehouse_id,
            location_id,
            quantity_on_hand: quantity_received,
            quantity_available: quantity_received,
            lot_number,
            serial_number,
            condition: condition || 'good',
            expiry_date
          });
      }
    }

    return new Response(JSON.stringify({ success: true, lineItem }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

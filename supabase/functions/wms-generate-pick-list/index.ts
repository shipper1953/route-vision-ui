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

    const { order_ids, company_id, warehouse_id, user_id } = await req.json();

    const pickLists = [];

    for (const orderId of order_ids) {
      // Get order details
      const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .select('*, items')
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error(`Failed to fetch order ${orderId}:`, orderError);
        continue;
      }

      // Create pick list
      const { data: pickList, error: pickListError } = await supabaseClient
        .from('pick_lists')
        .insert({
          company_id,
          order_id: orderId,
          warehouse_id,
          created_by: user_id
        })
        .select()
        .single();

      if (pickListError) {
        console.error(`Failed to create pick list for order ${orderId}:`, pickListError);
        continue;
      }

      // Process order items
      const items = Array.isArray(order.items) ? order.items : [];
      
      for (const [index, orderItem] of items.entries()) {
        // Find inventory for this item with FIFO logic
        const { data: inventory, error: inventoryError } = await supabaseClient
          .from('inventory_levels')
          .select('*, warehouse_locations(name)')
          .eq('item_id', orderItem.item_id || orderItem.id)
          .eq('warehouse_id', warehouse_id)
          .gt('quantity_available', 0)
          .order('received_date', { ascending: true })
          .limit(1)
          .single();

        if (inventoryError || !inventory) {
          console.error(`No inventory found for item ${orderItem.item_id || orderItem.id}`);
          continue;
        }

        // Create pick list item
        await supabaseClient
          .from('pick_list_items')
          .insert({
            pick_list_id: pickList.id,
            item_id: orderItem.item_id || orderItem.id,
            location_id: inventory.location_id,
            quantity_ordered: orderItem.quantity || 1,
            lot_number: inventory.lot_number,
            serial_number: inventory.serial_number
          });

        // Allocate inventory
        await supabaseClient
          .from('inventory_levels')
          .update({
            quantity_allocated: inventory.quantity_allocated + (orderItem.quantity || 1),
            quantity_available: inventory.quantity_available - (orderItem.quantity || 1)
          })
          .eq('id', inventory.id);
      }

      pickLists.push(pickList);
    }

    return new Response(JSON.stringify({ success: true, pickLists }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      warehouseId, 
      orderIds, 
      waveType = 'batch',
      priority = 5,
      assignedTo 
    } = await req.json();

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    // Generate wave number
    const waveNumber = `WAVE-${Date.now().toString().slice(-8)}`;

    // Create pick wave
    const { data: pickWave, error: waveError } = await supabase
      .from('pick_waves')
      .insert({
        wave_number: waveNumber,
        warehouse_id: warehouseId,
        company_id: userProfile.company_id,
        wave_type: waveType,
        priority,
        status: 'created',
        order_count: orderIds.length,
        created_by: user.id,
        assigned_to: assignedTo
      })
      .select()
      .single();

    if (waveError) throw waveError;

    // Create pick lists for each order
    const pickLists = [];
    let totalPicks = 0;

    for (const orderId of orderIds) {
      // Get order items
      const { data: order } = await supabase
        .from('orders')
        .select('id, items, company_id')
        .eq('id', orderId)
        .single();

      if (!order) continue;

      const pickListNumber = `PICK-${Date.now().toString().slice(-8)}-${orderId}`;

      // Create pick list
      const { data: pickList, error: pickListError } = await supabase
        .from('pick_lists')
        .insert({
          pick_list_number: pickListNumber,
          wave_id: pickWave.id,
          order_id: orderId,
          warehouse_id: warehouseId,
          company_id: userProfile.company_id,
          picker_id: assignedTo,
          pick_type: waveType === 'single' ? 'single_order' : 'batch',
          status: 'pending',
          priority
        })
        .select()
        .single();

      if (pickListError) {
        console.error('Pick list error:', pickListError);
        continue;
      }

      // Parse order items
      let orderItems = [];
      if (typeof order.items === 'string') {
        orderItems = JSON.parse(order.items);
      } else if (Array.isArray(order.items)) {
        orderItems = order.items;
      }

      // Create pick list lines
      let lineSequence = 1;
      const pickLines = [];

      for (const item of orderItems) {
        // Find inventory location for this item
        const { data: inventoryLevel } = await supabase
          .from('inventory_levels')
          .select('location_id, quantity_available, lot_number')
          .eq('item_id', item.itemId)
          .eq('warehouse_id', warehouseId)
          .gt('quantity_available', 0)
          .order('received_date', { ascending: true }) // FIFO
          .limit(1)
          .maybeSingle();

        if (inventoryLevel && inventoryLevel.quantity_available >= item.quantity) {
          pickLines.push({
            pick_list_id: pickList.id,
            item_id: item.itemId,
            location_id: inventoryLevel.location_id,
            quantity_requested: item.quantity,
            lot_number: inventoryLevel.lot_number,
            sequence: lineSequence++,
            status: 'pending'
          });
          totalPicks++;
        }
      }

      if (pickLines.length > 0) {
        const { error: linesError } = await supabase
          .from('pick_list_lines')
          .insert(pickLines);

        if (linesError) console.error('Pick lines error:', linesError);

        // Update pick list totals
        await supabase
          .from('pick_lists')
          .update({ total_lines: pickLines.length })
          .eq('id', pickList.id);
      }

      pickLists.push(pickList);
    }

    // Update wave totals
    await supabase
      .from('pick_waves')
      .update({ total_picks: totalPicks })
      .eq('id', pickWave.id);

    return new Response(JSON.stringify({ 
      success: true, 
      pickWave,
      pickLists,
      totalPicks
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating pick wave:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Calculate Manhattan distance between two locations
function calculateDistance(loc1: any, loc2: any): number {
  const aisleA = parseInt(loc1.aisle || '0');
  const aisleB = parseInt(loc2.aisle || '0');
  const rackA = parseInt(loc1.rack || '0');
  const rackB = parseInt(loc2.rack || '0');
  const shelfA = loc1.shelf?.charCodeAt(0) || 0;
  const shelfB = loc2.shelf?.charCodeAt(0) || 0;
  
  return Math.abs(aisleA - aisleB) + Math.abs(rackA - rackB) + Math.abs(shelfA - shelfB);
}

// Greedy Nearest Neighbor TSP approximation
function optimizePickRoute(locations: any[]): any[] {
  if (locations.length <= 1) return locations;
  
  const route = [locations[0]];
  const remaining = locations.slice(1);
  
  while (remaining.length > 0) {
    const current = route[route.length - 1];
    let nearest = remaining[0];
    let minDistance = calculateDistance(current, nearest);
    let nearestIndex = 0;
    
    for (let i = 1; i < remaining.length; i++) {
      const distance = calculateDistance(current, remaining[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = remaining[i];
        nearestIndex = i;
      }
    }
    
    route.push(nearest);
    remaining.splice(nearestIndex, 1);
  }
  
  return route;
}

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
      warehouse_id,
      order_ids,
      pick_strategy,
      max_orders_per_wave = 50,
      user_id
    } = await req.json();

    // Get user and validate
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: userProfile, error: profileError } = await supabaseClient
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile || userProfile.company_id !== company_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Company mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate warehouse ownership
    const { data: warehouseValid } = await supabaseClient
      .rpc('validate_warehouse_ownership', {
        p_warehouse_id: warehouse_id,
        p_company_id: userProfile.company_id
      });

    if (!warehouseValid) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Warehouse does not belong to your company' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate wave number
    const { data: existingWaves } = await supabaseClient
      .from('pick_waves')
      .select('wave_number')
      .eq('company_id', company_id)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastWaveNum = existingWaves?.[0]?.wave_number?.match(/\d+$/)?.[0] || '0';
    const waveNumber = `WAVE-${String(parseInt(lastWaveNum) + 1).padStart(4, '0')}`;

    // Create pick wave
    const { data: wave, error: waveError } = await supabaseClient
      .from('pick_waves')
      .insert({
        company_id,
        warehouse_id,
        wave_number: waveNumber,
        pick_strategy,
        total_orders: order_ids.length,
        created_by: user_id
      })
      .select()
      .single();

    if (waveError) throw waveError;

    // Group orders by zone for batch picking
    const ordersByZone: Record<string, any[]> = {};
    let totalPicks = 0;

    for (const orderId of order_ids) {
      // Get order items
      const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .select('*, items')
        .eq('id', orderId)
        .single();

      if (orderError || !order) continue;

      // Create pick list for this order
      const { data: pickList, error: pickListError } = await supabaseClient
        .from('pick_lists')
        .insert({
          company_id,
          order_id: orderId,
          warehouse_id,
          wave_id: wave.id,
          created_by: user_id
        })
        .select()
        .single();

      if (pickListError) continue;

      // Process items and group by zone
      const items = Array.isArray(order.items) ? order.items : [];
      
      for (const orderItem of items) {
        // Find inventory with location
        const { data: inventory, error: invError } = await supabaseClient
          .from('inventory_levels')
          .select('*, warehouse_locations(*)')
          .eq('item_id', orderItem.item_id || orderItem.id)
          .eq('warehouse_id', warehouse_id)
          .gt('quantity_available', 0)
          .order('received_date', { ascending: true })
          .limit(1)
          .single();

        if (invError || !inventory) continue;

        const zone = inventory.warehouse_locations?.zone || 'UNKNOWN';

        if (!ordersByZone[zone]) {
          ordersByZone[zone] = [];
        }

        ordersByZone[zone].push({
          pick_list_id: pickList.id,
          item_id: orderItem.item_id || orderItem.id,
          location_id: inventory.location_id,
          location_data: inventory.warehouse_locations,
          quantity_ordered: orderItem.quantity || 1,
          lot_number: inventory.lot_number,
          serial_number: inventory.serial_number,
          inventory_id: inventory.id
        });

        totalPicks++;

        // Allocate inventory
        await supabaseClient
          .from('inventory_levels')
          .update({
            quantity_allocated: inventory.quantity_allocated + (orderItem.quantity || 1),
            quantity_available: inventory.quantity_available - (orderItem.quantity || 1)
          })
          .eq('id', inventory.id);
      }
    }

    // Create optimized pick routes per zone
    let routeNumber = 1;
    
    for (const [zone, zonePicks] of Object.entries(ordersByZone)) {
      // Optimize picking sequence within zone
      const optimizedPicks = optimizePickRoute(zonePicks.map(p => ({
        ...p.location_data,
        pick_data: p
      }))).map(opt => opt.pick_data);

      // Insert pick list items in optimized order
      for (const pick of optimizedPicks) {
        await supabaseClient
          .from('pick_list_items')
          .insert({
            pick_list_id: pick.pick_list_id,
            item_id: pick.item_id,
            location_id: pick.location_id,
            quantity_ordered: pick.quantity_ordered,
            lot_number: pick.lot_number,
            serial_number: pick.serial_number
          });
      }

      // Create pick route record
      await supabaseClient
        .from('pick_routes')
        .insert({
          wave_id: wave.id,
          route_number: routeNumber++,
          start_location_id: optimizedPicks[0]?.location_id,
          locations: optimizedPicks.map(p => ({
            location_id: p.location_id,
            item_id: p.item_id,
            quantity: p.quantity_ordered
          })),
          total_distance: optimizedPicks.length * 10 // Simplified estimate
        });
    }

    // Update wave with total picks
    await supabaseClient
      .from('pick_waves')
      .update({ total_picks: totalPicks })
      .eq('id', wave.id);

    return new Response(JSON.stringify({
      success: true,
      wave: {
        ...wave,
        total_picks: totalPicks
      },
      routes: Object.keys(ordersByZone).length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating pick wave:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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

    const { company_id, warehouse_id, status } = await req.json();

    // Fetch pick lists with related data
    let query = supabaseClient
      .from('pick_lists')
      .select(`
        *,
        orders!inner(order_id),
        pick_list_items(
          *,
          items(name, sku),
          warehouse_locations(name)
        )
      `)
      .eq('company_id', company_id);

    if (warehouse_id) {
      query = query.eq('warehouse_id', warehouse_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Transform data to match frontend interface
    const pickLists = (data || []).map((pl: any) => ({
      id: pl.id,
      order_id: pl.order_id.toString(),
      order_number: pl.orders?.order_id || pl.order_id.toString(),
      warehouse_id: pl.warehouse_id,
      status: pl.status,
      assigned_to: pl.assigned_to,
      items: (pl.pick_list_items || []).map((item: any) => ({
        id: item.id,
        item_id: item.item_id,
        item_sku: item.items?.sku || '',
        item_name: item.items?.name || '',
        location_id: item.location_id,
        location_name: item.warehouse_locations?.name || '',
        quantity_ordered: item.quantity_ordered,
        quantity_picked: item.quantity_picked,
        lot_number: item.lot_number,
        serial_number: item.serial_number
      })),
      created_at: pl.created_at,
      started_at: pl.started_at,
      completed_at: pl.completed_at
    }));

    return new Response(JSON.stringify({ pickLists }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching pick lists:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

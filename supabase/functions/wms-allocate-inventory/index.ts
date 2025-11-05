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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { 
      orderId, 
      items, // [{ itemId, quantity }]
      warehouseId,
      allocationStrategy = 'FIFO' // FIFO, FEFO, LIFO
    } = await req.json();

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Get user's company for tenant validation
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Validate warehouse belongs to user's company
    const { data: warehouse } = await supabase
      .from('warehouses')
      .select('company_id')
      .eq('id', warehouseId)
      .single();

    if (!warehouse || warehouse.company_id !== userProfile.company_id) {
      throw new Error('Unauthorized: Warehouse does not belong to your company');
    }

    // Additional validation using RPC function
    const { data: warehouseValid } = await supabase
      .rpc('validate_warehouse_ownership', {
        p_warehouse_id: warehouseId,
        p_company_id: userProfile.company_id
      });

    if (!warehouseValid) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Warehouse validation failed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allocations = [];
    const errors = [];

    for (const item of items) {
      let query = supabase
        .from('inventory_levels')
        .select('*')
        .eq('item_id', item.itemId)
        .eq('warehouse_id', warehouseId)
        .eq('company_id', userProfile.company_id)
        .gt('quantity_available', 0);

      // Apply allocation strategy
      switch (allocationStrategy) {
        case 'FIFO':
          query = query.order('received_date', { ascending: true });
          break;
        case 'FEFO':
          query = query.order('expiration_date', { ascending: true });
          break;
        case 'LIFO':
          query = query.order('received_date', { ascending: false });
          break;
      }

      const { data: inventoryLevels, error: queryError } = await query;

      if (queryError) {
        errors.push({ itemId: item.itemId, error: queryError.message });
        continue;
      }

      if (!inventoryLevels || inventoryLevels.length === 0) {
        errors.push({ itemId: item.itemId, error: 'No inventory available' });
        continue;
      }

      // Allocate from available inventory levels
      let remainingToAllocate = item.quantity;
      const itemAllocations = [];

      for (const level of inventoryLevels) {
        if (remainingToAllocate <= 0) break;

        // Verify inventory level belongs to user's company
        if (level.company_id !== userProfile.company_id) {
          errors.push({ itemId: item.itemId, error: 'Unauthorized inventory access' });
          continue;
        }

        const allocateQty = Math.min(level.quantity_available, remainingToAllocate);

        // Update inventory level
        const { error: updateError } = await supabase
          .from('inventory_levels')
          .update({
            quantity_allocated: level.quantity_allocated + allocateQty,
            updated_at: new Date().toISOString()
          })
          .eq('id', level.id)
          .eq('company_id', userProfile.company_id);

        if (updateError) {
          errors.push({ itemId: item.itemId, error: updateError.message });
          continue;
        }

        itemAllocations.push({
          inventoryLevelId: level.id,
          locationId: level.location_id,
          quantityAllocated: allocateQty,
          lotNumber: level.lot_number,
          serialNumber: level.serial_number
        });

        remainingToAllocate -= allocateQty;
      }

      if (remainingToAllocate > 0) {
        errors.push({
          itemId: item.itemId,
          error: `Insufficient inventory. Short by ${remainingToAllocate} units`
        });
      }

      allocations.push({
        itemId: item.itemId,
        requestedQuantity: item.quantity,
        allocatedQuantity: item.quantity - remainingToAllocate,
        shortQuantity: remainingToAllocate,
        allocations: itemAllocations
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      orderId,
      allocations,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error allocating inventory:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

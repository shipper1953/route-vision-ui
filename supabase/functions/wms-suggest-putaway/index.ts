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

    const { itemId, warehouseId, quantity, itemDimensions } = await req.json();

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

    // Validate item belongs to user's company
    const { data: item } = await supabase
      .from('items')
      .select('company_id')
      .eq('id', itemId)
      .single();

    if (!item || item.company_id !== userProfile.company_id) {
      throw new Error('Unauthorized: Item does not belong to your company');
    }

    // Get available storage locations
    const { data: locations, error: locationsError } = await supabase
      .from('storage_locations')
      .select(`
        *,
        zone:warehouse_zones(zone_name, zone_type)
      `)
      .eq('warehouse_id', warehouseId)
      .eq('is_available', true)
      .order('zone_id');

    if (locationsError) throw locationsError;

    // Get current inventory levels for each location
    const { data: inventoryLevels } = await supabase
      .from('inventory_levels')
      .select('location_id, quantity_on_hand')
      .eq('warehouse_id', warehouseId)
      .eq('company_id', userProfile.company_id);

    const inventoryMap = new Map();
    inventoryLevels?.forEach(level => {
      const current = inventoryMap.get(level.location_id) || 0;
      inventoryMap.set(level.location_id, current + level.quantity_on_hand);
    });

    // Score each location
    const scoredLocations = locations.map(location => {
      let score = 100;

      // Prefer storage zones over other zones
      if (location.zone?.zone_type === 'storage') score += 30;
      if (location.zone?.zone_type === 'receiving') score -= 20;

      // Check capacity
      const currentStock = inventoryMap.get(location.id) || 0;
      if (location.capacity_cubic_ft && itemDimensions) {
        const itemVolume = itemDimensions.length * itemDimensions.width * itemDimensions.height / 1728;
        const remainingCapacity = location.capacity_cubic_ft - (currentStock * itemVolume);
        if (remainingCapacity > itemVolume * quantity) {
          score += 20;
        } else {
          score -= 50;
        }
      }

      // Prefer less congested locations
      if (currentStock === 0) score += 15;
      else if (currentStock < 100) score += 10;
      else if (currentStock > 500) score -= 10;

      // Weight capacity check
      if (location.max_weight_lbs && itemDimensions?.weight) {
        if (location.max_weight_lbs > (itemDimensions.weight * quantity)) {
          score += 10;
        } else {
          score -= 100; // Cannot use
        }
      }

      return {
        ...location,
        score,
        currentStock,
        zone: location.zone
      };
    });

    // Sort by score and return top 3
    const suggestions = scoredLocations
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(loc => ({
        locationId: loc.id,
        locationCode: loc.location_code,
        zoneName: loc.zone?.zone_name,
        zoneType: loc.zone?.zone_type,
        score: loc.score,
        currentStock: loc.currentStock,
        availableCapacity: loc.capacity_cubic_ft,
        reason: generateReason(loc)
      }));

    return new Response(JSON.stringify({ 
      success: true, 
      suggestions 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error suggesting putaway:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateReason(location: any): string {
  if (location.score >= 150) return 'Optimal location - high capacity, low congestion';
  if (location.score >= 120) return 'Good location - adequate space available';
  if (location.score >= 100) return 'Acceptable location - meets requirements';
  return 'Available location - limited capacity';
}

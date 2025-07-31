import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get order 58
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', 58)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message}`);
    }

    console.log('Order found:', order);
    console.log('Order items:', order.items);

    // Get company boxes
    const { data: boxes, error: boxError } = await supabase
      .from('boxes')
      .select('*')
      .eq('company_id', order.company_id)
      .eq('is_active', true)
      .gt('in_stock', 0);

    console.log('Available boxes:', boxes?.length || 0);

    if (boxError || !boxes || boxes.length === 0) {
      throw new Error(`No boxes available: ${boxError?.message}`);
    }

    // Check if order items have dimensions
    const orderItems = Array.isArray(order.items) ? order.items : [];
    const itemsWithDimensions = orderItems.filter(item => item.dimensions);
    
    console.log('Items with dimensions:', itemsWithDimensions.length);

    if (itemsWithDimensions.length > 0) {
      // Convert to cartonization format
      const items = itemsWithDimensions.map(item => ({
        id: item.itemId,
        name: item.name,
        sku: item.sku,
        length: item.dimensions.length,
        width: item.dimensions.width,
        height: item.dimensions.height,
        weight: item.dimensions.weight,
        quantity: item.quantity,
        category: 'order_item'
      }));

      console.log('Cartonization items:', items);

      // Simple box selection - find smallest box that fits
      const item = items[0]; // For testing, just use first item
      const suitableBoxes = boxes.filter(box => 
        box.length >= item.length &&
        box.width >= item.width &&
        box.height >= item.height &&
        box.max_weight >= item.weight * item.quantity
      );

      console.log('Suitable boxes:', suitableBoxes.length);

      if (suitableBoxes.length > 0) {
        // Pick the smallest suitable box
        const recommendedBox = suitableBoxes.sort((a, b) => 
          (a.length * a.width * a.height) - (b.length * b.width * b.height)
        )[0];

        const itemsWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
        const boxWeight = recommendedBox.cost * 0.1;
        const totalWeight = itemsWeight + boxWeight;

        console.log('Recommended box:', recommendedBox.name);
        
        // Store cartonization result
        const { error: cartonError } = await supabase.rpc('update_order_cartonization', {
          p_order_id: 58,
          p_recommended_box_id: recommendedBox.id,
          p_recommended_box_data: recommendedBox,
          p_utilization: 85, // Mock utilization
          p_confidence: 90, // Mock confidence
          p_total_weight: totalWeight,
          p_items_weight: itemsWeight,
          p_box_weight: boxWeight
        });

        if (cartonError) {
          throw new Error(`Error storing cartonization: ${cartonError.message}`);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            recommendedBox: recommendedBox.name,
            orderId: 58,
            message: 'Cartonization completed successfully' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        throw new Error('No suitable boxes found');
      }
    } else {
      throw new Error('No items with dimensions found');
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
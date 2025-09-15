import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CartonizationItem {
  itemId: string;
  quantity: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  name?: string;
  sku?: string;
}

interface Box {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  maxWeight: number;
  cost: number;
  type: string;
}

class EnhancedCartonizationEngine {
  private boxes: Box[];
  private readonly dimensionalWeightFactor = 139; // UPS/FedEx standard

  constructor(boxes: Box[]) {
    this.boxes = boxes.sort((a, b) => (a.length * a.width * a.height) - (b.length * b.width * b.height));
  }

  calculateOptimalBox(items: CartonizationItem[]): any {
    console.log(`🔍 Calculating optimal box for ${items.length} items`);
    
    if (!items.length) return null;

    const totalItemsVolume = items.reduce((sum, item) => 
      sum + (item.dimensions.length * item.dimensions.width * item.dimensions.height * item.quantity), 0
    );
    
    const totalWeight = items.reduce((sum, item) => sum + (item.dimensions.weight * item.quantity), 0);
    
    console.log(`📦 Total items volume: ${totalItemsVolume.toFixed(2)} cubic inches`);
    console.log(`⚖️ Total weight: ${totalWeight.toFixed(2)} lbs`);

    // Find smallest box that can physically fit all items and weight
    for (const box of this.boxes) {
      if (totalWeight <= box.maxWeight) {
        const boxVolume = box.length * box.width * box.height;
        
        // Check if items can physically fit (simple volume check + basic 3D fitting)
        if (boxVolume >= totalItemsVolume) {
          const canItemsFit = this.canItemsFitInBox(items, box);
          
          if (canItemsFit) {
            const utilization = (totalItemsVolume / boxVolume) * 100;
            const dimensionalWeight = boxVolume / this.dimensionalWeightFactor;
            const billableWeight = Math.max(totalWeight, dimensionalWeight);
            
            console.log(`✅ Selected box: ${box.name} (${box.length}x${box.width}x${box.height})`);
            console.log(`📊 Utilization: ${utilization.toFixed(1)}%`);
            console.log(`📏 Dimensional weight: ${dimensionalWeight.toFixed(2)} lbs`);
            console.log(`💰 Cost: $${box.cost}`);
            
            return {
              recommendedBox: box,
              utilization: utilization,
              confidence: utilization > 60 ? 95 : utilization > 40 ? 80 : 65,
              totalWeight: totalWeight,
              boxWeight: 0.5, // Estimated box weight
              actualWeight: totalWeight + 0.5,
              dimensionalWeight: dimensionalWeight,
              billableWeight: billableWeight,
              shippingCostImpact: this.calculateShippingCostImpact(box, totalWeight)
            };
          }
        }
      }
    }

    console.log('❌ No suitable box found');
    return null;
  }

  private canItemsFitInBox(items: CartonizationItem[], box: Box): boolean {
    // Sort items by volume (largest first for better packing)
    const sortedItems = [...items].sort((a, b) => {
      const volA = a.dimensions.length * a.dimensions.width * a.dimensions.height;
      const volB = b.dimensions.length * b.dimensions.width * b.dimensions.height;
      return volB - volA;
    });

    // Simple 3D fitting check - ensure largest item can fit
    for (const item of sortedItems) {
      const itemDims = [item.dimensions.length, item.dimensions.width, item.dimensions.height].sort((a, b) => b - a);
      const boxDims = [box.length, box.width, box.height].sort((a, b) => b - a);
      
      // Check if item can fit in any orientation
      if (itemDims[0] > boxDims[0] || itemDims[1] > boxDims[1] || itemDims[2] > boxDims[2]) {
        console.log(`❌ Item ${item.name || item.itemId} (${itemDims.join('x')}) won't fit in box ${box.name} (${boxDims.join('x')})`);
        return false;
      }
    }
    
    return true;
  }

  private calculateShippingCostImpact(box: Box, itemsWeight: number): number {
    const boxVolume = box.length * box.width * box.height;
    const dimensionalWeight = boxVolume / this.dimensionalWeightFactor;
    const billableWeight = Math.max(itemsWeight, dimensionalWeight);
    
    // Estimate shipping cost impact (simplified)
    const baseRate = 8.50; // Base shipping rate
    const weightRate = 0.85; // Per pound rate
    
    return baseRate + (billableWeight * weightRate);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { company_id } = await req.json();
    
    if (!company_id) {
      throw new Error('Company ID is required');
    }

    console.log(`🏢 Processing orders for company: ${company_id}`);

    // Get all boxes for the company
    const { data: boxes, error: boxesError } = await supabase
      .from('boxes')
      .select('*')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .order('cost', { ascending: true });

    if (boxesError) throw boxesError;
    
    if (!boxes || boxes.length === 0) {
      throw new Error('No boxes found for company');
    }

    console.log(`📦 Found ${boxes.length} available boxes`);

    // Get shipped/delivered orders without cartonization data
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_id,
        items,
        status,
        order_cartonization!left (order_id)
      `)
      .eq('company_id', company_id)
      .in('status', ['shipped', 'delivered'])
      .is('order_cartonization.order_id', null);

    if (ordersError) throw ordersError;

    console.log(`📋 Found ${orders?.length || 0} orders to process`);

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No orders need processing - all have cartonization data',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all items for reference
    const { data: allItems, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('company_id', company_id);

    if (itemsError) throw itemsError;

    const itemsMap = new Map(allItems?.map(item => [item.id, item]) || []);
    const engine = new EnhancedCartonizationEngine(boxes);
    
    let processed = 0;
    let errors = 0;

    for (const order of orders) {
      try {
        console.log(`\n🔄 Processing order ${order.order_id} (ID: ${order.id})`);
        
        // Parse order items
        const orderItems = Array.isArray(order.items) ? order.items : [];
        
        if (orderItems.length === 0) {
          console.log(`⚠️ Order ${order.order_id} has no items, skipping`);
          continue;
        }

        // Convert to cartonization items
        const cartonizationItems: CartonizationItem[] = orderItems.map((orderItem: any) => {
          const item = itemsMap.get(orderItem.itemId);
          if (!item) {
            console.log(`⚠️ Item ${orderItem.itemId} not found in master list`);
            return null;
          }

          return {
            itemId: orderItem.itemId,
            quantity: orderItem.quantity || 1,
            dimensions: {
              length: item.length || 6,
              width: item.width || 4, 
              height: item.height || 2,
              weight: item.weight || 1
            },
            name: item.name,
            sku: item.sku
          };
        }).filter(Boolean) as CartonizationItem[];

        if (cartonizationItems.length === 0) {
          console.log(`⚠️ Order ${order.order_id} has no valid items for cartonization`);
          continue;
        }

        // Calculate optimal box
        const result = engine.calculateOptimalBox(cartonizationItems);
        
        if (result) {
          // Save cartonization data
          const { error: insertError } = await supabase
            .from('order_cartonization')
            .insert({
              order_id: order.id,
              recommended_box_id: result.recommendedBox.id,
              recommended_box_data: result.recommendedBox,
              utilization: result.utilization,
              confidence: result.confidence,
              total_weight: result.actualWeight,
              items_weight: result.totalWeight,
              box_weight: result.boxWeight,
              calculation_timestamp: new Date().toISOString()
            });

          if (insertError) {
            console.error(`❌ Error saving cartonization for order ${order.order_id}:`, insertError);
            errors++;
          } else {
            console.log(`✅ Saved cartonization for order ${order.order_id}`);
            processed++;
          }
        } else {
          console.log(`❌ No suitable box found for order ${order.order_id}`);
          errors++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing order ${order.order_id}:`, error);
        errors++;
      }
    }

    console.log(`\n📊 Processing complete:`);
    console.log(`✅ Successfully processed: ${processed} orders`);
    console.log(`❌ Errors: ${errors} orders`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${processed} orders with ${errors} errors`,
        processed,
        errors 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in process-existing-orders function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
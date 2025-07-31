import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CartonizationEngine {
  calculateOptimalBox(items: any[]): any;
}

interface Item {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  quantity: number;
}

interface Box {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  maxWeight: number;
  cost: number;
  inStock: number;
  type: string;
}

interface CartonizationParameters {
  fillRateThreshold: number;
  maxPackageWeight: number;
  dimensionalWeightFactor: number;
  packingEfficiency: number;
  allowPartialFill: boolean;
  optimizeForCost: boolean;
  optimizeForSpace: boolean;
}

interface PackedItem {
  item: Item;
  x: number;
  y: number;
  z: number;
  length: number;
  width: number;
  height: number;
  rotated: boolean;
}

interface PackingResult {
  success: boolean;
  packedItems: PackedItem[];
  usedVolume: number;
  packingEfficiency: number;
}

interface CartonizationResult {
  recommendedBox: Box;
  utilization: number;
  itemsFit: boolean;
  totalWeight: number;
  totalVolume: number;
  dimensionalWeight: number;
  savings: number;
  confidence: number;
  alternatives: Array<{
    box: Box;
    utilization: number;
    cost: number;
    confidence: number;
  }>;
  rulesApplied: string[];
  processingTime: number;
}

// Simplified 3D bin packing algorithm
class BinPackingAlgorithm {
  static enhanced3DBinPacking(items: Item[], box: Box): PackingResult {
    const packedItems: PackedItem[] = [];
    let usedVolume = 0;
    let x = 0, y = 0, z = 0;

    for (const item of items) {
      for (let q = 0; q < item.quantity; q++) {
        const itemVolume = item.length * item.width * item.height;
        
        // Simple placement logic - check if item fits in remaining space
        if (x + item.length <= box.length && 
            y + item.width <= box.width && 
            z + item.height <= box.height) {
          
          packedItems.push({
            item,
            x, y, z,
            length: item.length,
            width: item.width,
            height: item.height,
            rotated: false
          });
          
          usedVolume += itemVolume;
          
          // Update position for next item
          x += item.length;
          if (x >= box.length) {
            x = 0;
            y += item.width;
            if (y >= box.width) {
              y = 0;
              z += item.height;
            }
          }
        } else {
          // Item doesn't fit
          return { success: false, packedItems: [], usedVolume: 0, packingEfficiency: 0 };
        }
      }
    }

    const boxVolume = box.length * box.width * box.height;
    const packingEfficiency = boxVolume > 0 ? (usedVolume / boxVolume) * 100 : 0;

    return {
      success: true,
      packedItems,
      usedVolume,
      packingEfficiency
    };
  }
}

// Simplified cartonization engine
class SimpleCartonizationEngine {
  private boxes: Box[];
  private parameters: CartonizationParameters;

  constructor(boxes: Box[], parameters: Partial<CartonizationParameters> = {}) {
    this.boxes = boxes.filter(box => box.inStock > 0);
    this.parameters = {
      fillRateThreshold: 70,
      maxPackageWeight: 70,
      dimensionalWeightFactor: 139,
      packingEfficiency: 85,
      allowPartialFill: true,
      optimizeForCost: false,
      optimizeForSpace: true,
      ...parameters
    };
  }

  calculateOptimalBox(items: Item[]): CartonizationResult | null {
    const startTime = Date.now();
    
    if (!items.length || !this.boxes.length) {
      return null;
    }

    const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    
    // Filter boxes by weight capacity
    const suitableBoxes = this.boxes.filter(box => box.maxWeight >= totalWeight);
    
    if (!suitableBoxes.length) {
      return null;
    }

    let bestResult: any = null;
    const alternatives: any[] = [];

    for (const box of suitableBoxes) {
      const packingResult = BinPackingAlgorithm.enhanced3DBinPacking(items, box);
      
      if (packingResult.success) {
        const utilization = packingResult.packingEfficiency;
        const confidence = Math.min(95, Math.max(50, utilization));
        const boxVolume = box.length * box.width * box.height;
        const dimensionalWeight = boxVolume / this.parameters.dimensionalWeightFactor;

        const result = {
          box,
          utilization,
          confidence,
          totalWeight,
          dimensionalWeight,
          cost: box.cost,
          itemsFit: true
        };

        alternatives.push(result);

        if (!bestResult || utilization > bestResult.utilization) {
          bestResult = result;
        }
      }
    }

    if (!bestResult) {
      return null;
    }

    const processingTime = Date.now() - startTime;

    return {
      recommendedBox: bestResult.box,
      utilization: bestResult.utilization,
      itemsFit: true,
      totalWeight: bestResult.totalWeight,
      totalVolume: items.reduce((sum, item) => sum + (item.length * item.width * item.height * item.quantity), 0),
      dimensionalWeight: bestResult.dimensionalWeight,
      savings: 0,
      confidence: bestResult.confidence,
      alternatives: alternatives.slice(0, 3),
      rulesApplied: ['weight_check', 'dimensional_fit', 'utilization_optimization'],
      processingTime
    };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderIds } = await req.json();
    console.log('Recalculating cartonization for orders:', orderIds);

    // Get user from auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user auth and get user info
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      throw new Error('User profile not found');
    }

    let ordersQuery = supabase
      .from('orders')
      .select('id, items, company_id');

    // Filter orders based on request
    if (orderIds && orderIds.length > 0) {
      ordersQuery = ordersQuery.in('id', orderIds);
    }

    // Apply company filter unless super admin
    if (userProfile.role !== 'super_admin') {
      ordersQuery = ordersQuery.eq('company_id', userProfile.company_id);
    }

    const { data: orders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      throw ordersError;
    }

    // Get boxes for the company
    let boxesQuery = supabase
      .from('boxes')
      .select('*')
      .eq('is_active', true);

    if (userProfile.role !== 'super_admin') {
      boxesQuery = boxesQuery.eq('company_id', userProfile.company_id);
    }

    const { data: boxes, error: boxesError } = await boxesQuery;

    if (boxesError) {
      console.error('Error fetching boxes:', boxesError);
      throw boxesError;
    }

    // Get master items for dimensions
    const { data: masterItems, error: masterError } = await supabase
      .from('item_master')
      .select('*');

    if (masterError) {
      console.error('Error fetching master items:', masterError);
    }

    const results = [];
    const engine = new SimpleCartonizationEngine(boxes || []);

    for (const order of orders || []) {
      try {
        console.log(`Processing order ${order.id}`);
        
        // Convert order items to cartonization items
        const items: Item[] = [];
        
        if (Array.isArray(order.items)) {
          for (const orderItem of order.items) {
            const masterItem = masterItems?.find(m => m.id === orderItem.itemId);
            
            if (masterItem && masterItem.length && masterItem.width && masterItem.height && masterItem.weight) {
              items.push({
                id: orderItem.itemId,
                name: masterItem.name || `Item ${orderItem.itemId}`,
                length: masterItem.length,
                width: masterItem.width,
                height: masterItem.height,
                weight: masterItem.weight,
                quantity: orderItem.quantity
              });
            } else {
              // Use default dimensions if no master item data
              items.push({
                id: orderItem.itemId,
                name: `Item ${orderItem.itemId}`,
                length: 6,
                width: 4,
                height: 2,
                weight: 0.5,
                quantity: orderItem.quantity
              });
            }
          }
        }

        if (items.length === 0) {
          console.log(`No items found for order ${order.id}`);
          continue;
        }

        const result = engine.calculateOptimalBox(items);
        
        if (result) {
          const itemsWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
          const boxWeight = 0.1; // Approximate box weight
          
          // Delete existing cartonization record
          await supabase
            .from('order_cartonization')
            .delete()
            .eq('order_id', order.id);

          // Insert new cartonization record
          const { error: insertError } = await supabase
            .from('order_cartonization')
            .insert({
              order_id: order.id,
              recommended_box_id: result.recommendedBox.id,
              recommended_box_data: result.recommendedBox,
              utilization: result.utilization,
              confidence: result.confidence,
              total_weight: result.totalWeight + boxWeight,
              items_weight: itemsWeight,
              box_weight: boxWeight
            });

          if (insertError) {
            console.error(`Error inserting cartonization for order ${order.id}:`, insertError);
          } else {
            console.log(`Successfully calculated cartonization for order ${order.id}`);
            results.push({ orderId: order.id, success: true, result });
          }
        } else {
          console.log(`No suitable box found for order ${order.id}`);
          results.push({ orderId: order.id, success: false, error: 'No suitable box found' });
        }
      } catch (error) {
        console.error(`Error processing order ${order.id}:`, error);
        results.push({ orderId: order.id, success: false, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in recalculate-cartonization:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
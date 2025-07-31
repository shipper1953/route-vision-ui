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

interface Space {
  x: number;
  y: number;
  z: number;
  length: number;
  width: number;
  height: number;
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

// Enhanced 3D bin packing algorithm with rotation support
class BinPackingAlgorithm {
  static enhanced3DBinPacking(items: Item[], box: Box): PackingResult {
    // Expand items by quantity
    const expandedItems: Item[] = [];
    items.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        expandedItems.push({ ...item, quantity: 1 });
      }
    });

    // Sort items by volume (largest first) for better packing
    const sortedItems = expandedItems.sort((a, b) => 
      (b.length * b.width * b.height) - (a.length * a.width * a.height)
    );

    const packedItems: PackedItem[] = [];
    const spaces: Space[] = [{
      x: 0, y: 0, z: 0,
      length: box.length,
      width: box.width,
      height: box.height
    }];

    console.log(`Starting 3D bin packing for ${sortedItems.length} items in box ${box.name} (${box.length}x${box.width}x${box.height})`);

    for (const item of sortedItems) {
      let itemPacked = false;
      
      // Try to find a space where this item fits
      for (let spaceIndex = 0; spaceIndex < spaces.length && !itemPacked; spaceIndex++) {
        const space = spaces[spaceIndex];
        
        // Try all 6 possible orientations of the item
        const orientations = [
          { l: item.length, w: item.width, h: item.height, rotated: false },
          { l: item.length, w: item.height, h: item.width, rotated: true },
          { l: item.width, w: item.length, h: item.height, rotated: true },
          { l: item.width, w: item.height, h: item.length, rotated: true },
          { l: item.height, w: item.length, h: item.width, rotated: true },
          { l: item.height, w: item.width, h: item.length, rotated: true }
        ];

        for (const orientation of orientations) {
          if (orientation.l <= space.length && 
              orientation.w <= space.width && 
              orientation.h <= space.height) {
            
            // Item fits in this orientation
            const packedItem: PackedItem = {
              item,
              x: space.x,
              y: space.y,
              z: space.z,
              length: orientation.l,
              width: orientation.w,
              height: orientation.h,
              rotated: orientation.rotated
            };
            
            packedItems.push(packedItem);
            
            // Remove the used space and create new spaces
            spaces.splice(spaceIndex, 1);
            
            // Create up to 3 new spaces from the remaining space
            const newSpaces: Space[] = [];
            
            // Right space
            if (space.x + orientation.l < space.x + space.length) {
              newSpaces.push({
                x: space.x + orientation.l,
                y: space.y,
                z: space.z,
                length: space.length - orientation.l,
                width: space.width,
                height: space.height
              });
            }
            
            // Back space
            if (space.y + orientation.w < space.y + space.width) {
              newSpaces.push({
                x: space.x,
                y: space.y + orientation.w,
                z: space.z,
                length: orientation.l,
                width: space.width - orientation.w,
                height: space.height
              });
            }
            
            // Top space
            if (space.z + orientation.h < space.z + space.height) {
              newSpaces.push({
                x: space.x,
                y: space.y,
                z: space.z + orientation.h,
                length: orientation.l,
                width: orientation.w,
                height: space.height - orientation.h
              });
            }
            
            // Add new spaces, sorted by volume (smallest first for better packing)
            newSpaces.sort((a, b) => (a.length * a.width * a.height) - (b.length * b.width * b.height));
            spaces.splice(spaceIndex, 0, ...newSpaces);
            
            itemPacked = true;
            console.log(`✅ Packed item ${item.name} (${orientation.l}x${orientation.w}x${orientation.h}${orientation.rotated ? ' rotated' : ''})`);
            break;
          }
        }
      }
      
      if (!itemPacked) {
        console.log(`❌ Could not pack item ${item.name} (${item.length}x${item.width}x${item.height}) - no suitable space found`);
        // Return failure if any item doesn't fit
        return {
          success: false,
          packedItems: [],
          usedVolume: 0,
          packingEfficiency: 0
        };
      }
    }
    
    // Calculate used volume and packing efficiency
    const usedVolume = packedItems.reduce((sum, packed) => 
      sum + (packed.length * packed.width * packed.height), 0
    );
    const boxVolume = box.length * box.width * box.height;
    const packingEfficiency = usedVolume / boxVolume;
    
    console.log(`✅ Successfully packed all ${packedItems.length} items. Used volume: ${usedVolume}/${boxVolume} (${(packingEfficiency * 100).toFixed(1)}%)`);
    
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
    
    console.log(`Total weight: ${totalWeight}, Available boxes:`, this.boxes.map(b => `${b.name}(${b.maxWeight}kg)`));
    
    // Filter boxes by weight capacity
    const suitableBoxes = this.boxes.filter(box => box.maxWeight >= totalWeight);
    
    console.log(`Suitable boxes for weight ${totalWeight}:`, suitableBoxes.map(b => `${b.name}(${b.length}x${b.width}x${b.height})`));
    
    if (!suitableBoxes.length) {
      console.log('No boxes can handle the weight requirement');
      return null;
    }

    let bestResult: any = null;
    const alternatives: any[] = [];

    for (const box of suitableBoxes) {
      console.log(`Testing box ${box.name} (${box.length}x${box.width}x${box.height}) for items:`, items.map(i => `${i.name}(${i.length}x${i.width}x${i.height})`));
      const packingResult = BinPackingAlgorithm.enhanced3DBinPacking(items, box);
      
      if (packingResult.success) {
        console.log(`✅ Box ${box.name} packing successful with ${(packingResult.packingEfficiency * 100).toFixed(1)}% efficiency`);
      } else {
        console.log(`❌ Box ${box.name} packing failed`);
      }
      
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
      .select('id, items, company_id, status, order_id, customer_name');

    // Filter orders based on request
    if (orderIds && orderIds.length > 0) {
      ordersQuery = ordersQuery.in('id', orderIds);
    } else {
      // If no specific orders, process ready-to-ship orders
      ordersQuery = ordersQuery.eq('status', 'ready_to_ship');
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


    const results = [];
    const engine = new SimpleCartonizationEngine(boxes || []);

    for (const order of orders || []) {
      try {
        console.log(`Processing order ${order.id}`);
        
        // Convert order items to cartonization items using the dimensions from the order items themselves
        const items: Item[] = [];
        
        if (Array.isArray(order.items)) {
          for (const orderItem of order.items) {
            // Use dimensions from the order item if available
            if (orderItem.dimensions && orderItem.dimensions.length && orderItem.dimensions.width && orderItem.dimensions.height && orderItem.dimensions.weight) {
              items.push({
                id: orderItem.itemId || `item_${items.length}`,
                name: orderItem.name || `Item ${orderItem.itemId || items.length}`,
                length: orderItem.dimensions.length,
                width: orderItem.dimensions.width,
                height: orderItem.dimensions.height,
                weight: orderItem.dimensions.weight,
                quantity: orderItem.quantity || 1
              });
            } else {
              // Use fallback dimensions if no dimensions in order item
              items.push({
                id: orderItem.itemId || `item_${items.length}`,
                name: orderItem.name || `Item ${orderItem.itemId || items.length}`,
                length: 6,
                width: 4,
                height: 2,
                weight: 0.5,
                quantity: orderItem.quantity || 1
              });
            }
          }
        }

        if (items.length === 0) {
          console.log(`No items found for order ${order.id}`);
          continue;
        }

        console.log(`Order ${order.id} has ${items.length} items:`, items.map(i => `${i.name} (${i.length}x${i.width}x${i.height}, ${i.weight}kg)`));

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
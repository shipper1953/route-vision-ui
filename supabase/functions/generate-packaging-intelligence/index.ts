import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderAnalysis {
  order_id: string;
  items: any[];
  recommendedBoxes: any[];
  currentPackaging?: any;
  potentialSavings: number;
  confidence: number;
}

interface InventorySuggestion {
  box_id: string;
  box_name: string;
  current_stock: number;
  projected_need: number;
  days_of_supply: number;
  suggestion: string;
  urgency: 'low' | 'medium' | 'high';
  cost_per_unit: number;
  orders_needing_this_box: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id } = await req.json();

    if (!company_id) {
      throw new Error('Company ID is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Generating packaging intelligence report for company: ${company_id}`);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Step 1: Get all recent orders with their actual item details
    const { data: recentOrders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_id,
        status,
        items,
        created_at,
        shipments!left (
          id,
          cost,
          carrier,
          service,
          package_dimensions,
          actual_package_sku,
          actual_package_master_id,
          total_weight
        )
      `)
      .eq('company_id', company_id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(200);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      throw new Error(`Failed to fetch orders: ${ordersError.message}`);
    }

    // Step 1.1: Get the company's item master data for dimension lookups
    const { data: companyItems, error: itemsError } = await supabase
      .from('items')
      .select('id, sku, name, length, width, height, weight, category')
      .eq('company_id', company_id)
      .eq('is_active', true);

    if (itemsError) {
      console.error('Error fetching company items:', itemsError);
      throw new Error(`Failed to fetch company items: ${itemsError.message}`);
    }

    // Create a lookup map for items
    const itemsMap = new Map(companyItems?.map(item => [item.id, item]) || []);

    console.log(`Found ${recentOrders?.length || 0} recent orders to analyze`);
    
    if (!recentOrders || recentOrders.length === 0) {
      console.log('No recent orders found, returning basic report');
      
      // Return a basic report structure when no orders are found
      const basicReport = {
        company_id,
        generated_at: new Date().toISOString(),
        analysis_period: 'Last 30 days',
        total_orders_analyzed: 0,
        potential_savings: 0,
        top_5_most_used_boxes: [],
        top_5_box_discrepancies: [],
        inventory_suggestions: [],
        projected_packaging_need: {},
        report_data: {
          orders_with_current_inventory: 0,
          orders_needing_new_boxes: 0,
          total_discrepancies_found: 0,
          total_orders_with_opportunities: 0,
          average_cost_per_discrepancy: 0,
          total_box_recommendations: 0,
          high_impact_opportunities: 0
        }
      };

      // Save basic report
      const { error: reportError } = await supabase
        .from('packaging_intelligence_reports')
        .insert([basicReport]);

      if (reportError) {
        console.error('Error saving basic report:', reportError);
        throw new Error(`Failed to save basic report: ${reportError.message}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No orders to analyze, basic report generated',
          orders_analyzed: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!recentOrders || recentOrders.length === 0) {
      console.log('No recent orders found, returning basic report');
      
      // Return a basic report structure when no orders are found
      const basicReport = {
        company_id,
        generated_at: new Date().toISOString(),
        analysis_period: 'Last 30 days',
        total_orders_analyzed: 0,
        potential_savings: 0,
        top_5_most_used_boxes: [],
        top_5_box_discrepancies: [],
        inventory_suggestions: [],
        projected_packaging_need: {},
        report_data: {
          orders_with_current_inventory: 0,
          orders_needing_new_boxes: 0,
          total_discrepancies_found: 0,
          total_orders_with_opportunities: 0,
          average_cost_per_discrepancy: 0,
          total_box_recommendations: 0,
          high_impact_opportunities: 0
        }
      };

      // Save basic report
      const { error: reportError } = await supabase
        .from('packaging_intelligence_reports')
        .insert([basicReport]);

      if (reportError) {
        console.error('Error saving basic report:', reportError);
        throw new Error(`Failed to save basic report: ${reportError.message}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No orders to analyze, basic report generated',
          orders_analyzed: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log(`Found ${companyItems?.length || 0} items in company master data`);

    // Step 2: Get current company box inventory
    const { data: companyBoxes, error: companyBoxError } = await supabase
      .from('boxes')
      .select('id, name, sku, length, width, height, max_weight, cost, is_active')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .order('cost', { ascending: true });

    if (companyBoxError) {
      console.error('Error fetching company boxes:', companyBoxError);
      throw new Error(`Failed to fetch company boxes: ${companyBoxError.message}`);
    }

    console.log(`Company has ${companyBoxes?.length || 0} box types in inventory`);

    // Step 3: Get all Uline packaging options
    const { data: availablePackaging, error: packagingError } = await supabase
      .from('packaging_master_list')
      .select('id, vendor_sku, name, length_in, width_in, height_in, weight_oz, cost, is_active')
      .eq('is_active', true)
      .order('cost', { ascending: true });

    if (packagingError) {
      console.error('Error fetching packaging options:', packagingError);
      throw new Error(`Failed to fetch packaging options: ${packagingError.message}`);
    }

    console.log(`Uline catalog has ${availablePackaging?.length || 0} packaging options available`);

    // Step 4: Enhanced Cartonization Engine
    class PackagingIntelligenceEngine {
      constructor(private companyBoxes: any[], private ulineBoxes: any[], private itemsMap: Map<string, any>) {}
      
      analyzeOrder(order: any) {
        const items = Array.isArray(order.items) ? order.items : [];
        if (!items.length) return null;

        // Convert order items to cartonization format with actual item dimensions
        const cartonItems = items.map((orderItem: any, index: number) => {
          const masterItem = this.itemsMap.get(orderItem.itemId);
          
          if (masterItem) {
            // Use actual item dimensions from master data
            return {
              id: orderItem.itemId,
              name: masterItem.name,
              length: Number(masterItem.length) || 6,
              width: Number(masterItem.width) || 4,  
              height: Number(masterItem.height) || 2,
              weight: Number(masterItem.weight) || 0.5, // Already in lbs
              quantity: orderItem.quantity || 1,
              category: masterItem.category || 'general'
            };
          } else {
            // Create varied realistic dimensions for testing when no master item found
            const itemVariations = [
              { name: 'Small Item', length: 4, width: 3, height: 2, weight: 0.5 },
              { name: 'Medium Item', length: 8, width: 6, height: 4, weight: 1.5 },
              { name: 'Large Item', length: 12, width: 8, height: 6, weight: 3.0 },
              { name: 'Long Item', length: 18, width: 4, height: 3, weight: 2.0 },
              { name: 'Tall Item', length: 6, width: 6, height: 10, weight: 2.5 },
              { name: 'Flat Item', length: 12, width: 9, height: 1, weight: 1.0 },
              { name: 'Heavy Small Item', length: 5, width: 5, height: 4, weight: 4.0 }
            ];
            
            // Use order ID and item index to create consistent but varied items
            const orderHash = parseInt(order.order_id.replace(/\D/g, '')) || 1;
            const variationIndex = (orderHash + index) % itemVariations.length;
            const variation = itemVariations[variationIndex];
            
            const quantity = orderItem.quantity || orderItem.count || 1;
            
            return {
              id: orderItem.itemId || `item-${index}`,
              name: variation.name,
              length: variation.length,
              width: variation.width,
              height: variation.height,
              weight: variation.weight,
              quantity: quantity,
              category: 'general'
            };
          }
        });

        // Calculate total cube and weight
        const totalCube = cartonItems.reduce((sum, item) => 
          sum + (item.length * item.width * item.height * item.quantity), 0
        );
        
        const orderWeight = cartonItems.reduce((sum, item) => 
          sum + (item.weight * item.quantity), 0
        );

        console.log(`📦 Order ${order.order_id}: ${cartonItems.length} items, ${totalCube.toFixed(2)} cubic inches, ${orderWeight.toFixed(2)} lbs`);

        // Try company inventory first
        let companyBoxResult = this.findOptimalBox(cartonItems, this.companyBoxes, 'company');
        
        // Try Uline catalog for comparison or if no company box found
        let ulineBoxResult = this.findOptimalBox(cartonItems, this.ulineBoxes, 'uline');

        return {
          order_id: order.order_id,
          items: cartonItems,
          totalCube,
          orderWeight,
          companyBoxResult,
          ulineBoxResult,
          actualShipment: order.shipments?.[0] || null
        };
      }
      
      findOptimalBox(items: any[], boxes: any[], source: 'company' | 'uline') {
        const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
        const totalVolume = items.reduce((sum, item) => 
          sum + (item.length * item.width * item.height * item.quantity), 0);
        
        console.log(`🔍 Looking for ${source} box for ${totalVolume.toFixed(2)} cubic inches, ${totalWeight.toFixed(2)} lbs`);
        
        // Filter boxes that can handle the weight and have sufficient volume
        const candidateBoxes = boxes.filter(box => {
          const lengthKey = source === 'uline' ? 'length_in' : 'length';
          const widthKey = source === 'uline' ? 'width_in' : 'width';
          const heightKey = source === 'uline' ? 'height_in' : 'height';
          const weightKey = source === 'uline' ? 'weight_oz' : 'max_weight';
          
          const boxVolume = Number(box[lengthKey]) * Number(box[widthKey]) * Number(box[heightKey]);
          const maxWeight = source === 'uline' 
            ? 50 // Assume 50 lbs max for Uline boxes
            : Number(box[weightKey] || 50);
          
          // Box must have enough volume and weight capacity
          const hasEnoughVolume = boxVolume >= totalVolume * 1.1; // 10% packing efficiency buffer
          const hasEnoughWeight = totalWeight <= maxWeight;
          const itemsFit = this.canItemsFit(items, box, source);
          
          return hasEnoughVolume && hasEnoughWeight && itemsFit;
        });
        
        if (!candidateBoxes.length) {
          console.log(`❌ No suitable ${source} boxes found`);
          return null;
        }
        
        // Score boxes by efficiency: prioritize high utilization and low cost
        const scoredBoxes = candidateBoxes.map(box => {
          const lengthKey = source === 'uline' ? 'length_in' : 'length';
          const widthKey = source === 'uline' ? 'width_in' : 'width';
          const heightKey = source === 'uline' ? 'height_in' : 'height';
          
          const boxVolume = Number(box[lengthKey]) * Number(box[widthKey]) * Number(box[heightKey]);
          const utilization = Math.min((totalVolume / boxVolume) * 100, 100);
          const costPerCubicInch = Number(box.cost || 0) / boxVolume;
          
          // Higher utilization is better, lower cost per cubic inch is better
          const efficiency = utilization - (costPerCubicInch * 10000);
          
          return {
            ...box,
            boxVolume,
            utilization,
            costPerCubicInch,
            efficiency,
            source
          };
        }).sort((a, b) => b.efficiency - a.efficiency);
        
        const bestBox = scoredBoxes[0];
        console.log(`✅ Best ${source} box: ${bestBox.name || bestBox.vendor_sku} (${bestBox.utilization.toFixed(1)}% utilization)`);
        
        return bestBox;
      }
      
      canItemsFit(items: any[], box: any, source: 'company' | 'uline'): boolean {
        const lengthKey = source === 'uline' ? 'length_in' : 'length';
        const widthKey = source === 'uline' ? 'width_in' : 'width';
        const heightKey = source === 'uline' ? 'height_in' : 'height';
        
        const boxDims = [
          Number(box[lengthKey]),
          Number(box[widthKey]), 
          Number(box[heightKey])
        ].sort((a, b) => b - a);
        
        // Check if each item can fit in any orientation
        for (const item of items) {
          for (let qty = 0; qty < item.quantity; qty++) {
            const itemDims = [
              Number(item.length),
              Number(item.width),
              Number(item.height)
            ].sort((a, b) => b - a);
            
            // Item must fit in largest-to-smallest dimension mapping
            if (itemDims[0] > boxDims[0] || itemDims[1] > boxDims[1] || itemDims[2] > boxDims[2]) {
              return false;
            }
          }
        }
        return true;
      }
      
      calculateSavings(currentBox: any, optimalBox: any, weight: number, currentSource: string, optimalSource: string) {
        const dimWeightFactor = 139;
        const shippingCostPerLb = 0.15;
        
        const currentLengthKey = currentSource === 'uline' ? 'length_in' : 'length';
        const currentWidthKey = currentSource === 'uline' ? 'width_in' : 'width'; 
        const currentHeightKey = currentSource === 'uline' ? 'height_in' : 'height';
        
        const optimalLengthKey = optimalSource === 'uline' ? 'length_in' : 'length';
        const optimalWidthKey = optimalSource === 'uline' ? 'width_in' : 'width';
        const optimalHeightKey = optimalSource === 'uline' ? 'height_in' : 'height';
        
        const currentVolume = currentBox[currentLengthKey] * currentBox[currentWidthKey] * currentBox[currentHeightKey];
        const optimalVolume = optimalBox[optimalLengthKey] * optimalBox[optimalWidthKey] * optimalBox[optimalHeightKey];
        
        const currentDimWeight = currentVolume / dimWeightFactor;
        const optimalDimWeight = optimalVolume / dimWeightFactor;
        
        const currentBillableWeight = Math.max(weight, currentDimWeight);
        const optimalBillableWeight = Math.max(weight, optimalDimWeight);
        
        const materialSavings = Math.max(0, currentBox.cost - optimalBox.cost);
        const shippingSavings = (currentBillableWeight - optimalBillableWeight) * shippingCostPerLb;
        
        return {
          materialSavings,
          shippingSavings,
          totalSavings: materialSavings + shippingSavings,
          currentVolume,
          optimalVolume,
          volumeReduction: ((currentVolume - optimalVolume) / currentVolume) * 100
        };
      }
    }

    // Step 5: Analyze all orders with enhanced algorithm
    console.log('Analyzing packaging efficiency with enhanced algorithm...');
    
    const engine = new PackagingIntelligenceEngine(companyBoxes || [], availablePackaging || [], itemsMap);
    const orderAnalyses: any[] = [];
    const unpackageableOrders: any[] = [];
    const boxRecommendations: Map<string, InventorySuggestion> = new Map();
    const boxUsageCount: Record<string, number> = {};
    const actualBoxUsageCount: Record<string, number> = {};
    const detailedDiscrepancies: any[] = [];
    let totalPotentialSavings = 0;

    for (const order of recentOrders || []) {
      const analysis = engine.analyzeOrder(order);
      if (!analysis) continue;
      
      orderAnalyses.push(analysis);
      
      console.log(`\n📋 Order ${order.order_id}: ${analysis.totalCube.toFixed(2)} cubic inches`);
      
      // Track what happened with this order
      if (!analysis.companyBoxResult) {
        // Order can't be packaged with company inventory
        console.log(`❌ No company box can handle this order`);
        unpackageableOrders.push(analysis);
        
        if (analysis.ulineBoxResult) {
          // But can be packaged with Uline box - add to recommendations
          const ulineBox = analysis.ulineBoxResult;
          const sku = ulineBox.vendor_sku;
          
          console.log(`💡 Uline option available: ${ulineBox.name} (${sku})`);
          
          if (!boxRecommendations.has(sku)) {
            boxRecommendations.set(sku, {
              box_id: sku,
              box_name: ulineBox.name,
              current_stock: 0, // Not in inventory
              projected_need: 0,
              days_of_supply: 0,
              suggestion: `Add ${ulineBox.name} to inventory`,
              urgency: 'medium',
              cost_per_unit: ulineBox.cost,
              orders_needing_this_box: []
            });
          }
          
          const recommendation = boxRecommendations.get(sku)!;
          recommendation.projected_need += 1;
          recommendation.orders_needing_this_box.push(order.order_id);
          recommendation.suggestion = `Add ${ulineBox.name} (${sku}) to inventory - would package ${recommendation.projected_need} orders more efficiently`;
          
          if (recommendation.projected_need >= 5) {
            recommendation.urgency = 'high';
          } else if (recommendation.projected_need >= 2) {
            recommendation.urgency = 'medium';
          }
        } else {
          console.log(`❌ No suitable Uline box found either`);
        }
      } else {
        // Order can be packaged with company inventory
        const companySku = analysis.companyBoxResult.sku || analysis.companyBoxResult.name;
        boxUsageCount[companySku] = (boxUsageCount[companySku] || 0) + 1;
        
        console.log(`✅ Company box works: ${analysis.companyBoxResult.name} (${analysis.companyBoxResult.utilization.toFixed(1)}% utilization)`);
        
        // Check if there's a better Uline option
        if (analysis.ulineBoxResult && analysis.ulineBoxResult.utilization > analysis.companyBoxResult.utilization + 5) {
          const savings = engine.calculateSavings(
            analysis.companyBoxResult, 
            analysis.ulineBoxResult,
            analysis.orderWeight,
            'company',
            'uline'
          );
          
          if (savings.totalSavings > 0.10) { // Lower threshold for better detection
            totalPotentialSavings += savings.totalSavings;
            
            console.log(`💰 Better Uline option: ${analysis.ulineBoxResult.name} saves $${savings.totalSavings.toFixed(2)}`);
            
            detailedDiscrepancies.push({
              order_id: order.order_id,
              actual_box: `${analysis.companyBoxResult.name} (Current Inventory)`,
              optimal_box: `${analysis.ulineBoxResult.name} (${analysis.ulineBoxResult.vendor_sku})`,
              actual_cube: analysis.companyBoxResult.boxVolume.toFixed(2),
              optimal_cube: analysis.ulineBoxResult.boxVolume.toFixed(2),
              current_utilization: analysis.companyBoxResult.utilization.toFixed(1),
              optimal_utilization: analysis.ulineBoxResult.utilization.toFixed(1),
              cube_reduction: ((analysis.companyBoxResult.boxVolume - analysis.ulineBoxResult.boxVolume) / analysis.companyBoxResult.boxVolume * 100).toFixed(1),
              material_savings: savings.materialSavings,
              shipping_savings: savings.shippingSavings,
              total_savings: savings.totalSavings,
              confidence: savings.totalSavings > 1.0 ? 95 : 85,
              potential_savings: savings.totalSavings
            });
            
            // Also recommend this Uline box for inventory addition
            const ulineSku = analysis.ulineBoxResult.vendor_sku;
            if (!boxRecommendations.has(ulineSku)) {
              boxRecommendations.set(ulineSku, {
                box_id: ulineSku,
                box_name: analysis.ulineBoxResult.name,
                current_stock: 0,
                projected_need: 0,
                days_of_supply: 0,
                suggestion: `Replace current inventory with ${analysis.ulineBoxResult.name}`,
                urgency: 'low',
                cost_per_unit: analysis.ulineBoxResult.cost,
                orders_needing_this_box: []
              });
            }
            
            const ulineRec = boxRecommendations.get(ulineSku)!;
            ulineRec.projected_need += 1;
            ulineRec.orders_needing_this_box.push(order.order_id);
          }
        }
      }
      
      // Track actual usage for shipped orders
      if (analysis.actualShipment?.actual_package_sku) {
        const actualSku = analysis.actualShipment.actual_package_sku;
        actualBoxUsageCount[actualSku] = (actualBoxUsageCount[actualSku] || 0) + 1;
      }
    }

    console.log(`Found ${unpackageableOrders.length} orders that can't be packaged with current inventory`);
    console.log(`Generated ${boxRecommendations.size} box addition recommendations`);

    // Step 6: Aggregate and group packaging opportunities
    
    // Group opportunities by recommended Uline box
    const groupedOpportunities = new Map<string, {
      uline_sku: string,
      uline_name: string,
      orders: string[],
      total_savings: number,
      avg_utilization_improvement: number,
      cost_per_unit: number,
      urgency: string
    }>();

    detailedDiscrepancies.forEach(disc => {
      const ulineSku = disc.optimal_box.split('(')[1]?.replace(')', '') || disc.optimal_box;
      const existing = groupedOpportunities.get(ulineSku) || {
        uline_sku: ulineSku,
        uline_name: disc.optimal_box.split(' (')[0] || disc.optimal_box,
        orders: [],
        total_savings: 0,
        avg_utilization_improvement: 0,
        cost_per_unit: 0,
        urgency: 'low'
      };

      existing.orders.push(disc.order_id);
      existing.total_savings += disc.total_savings;
      existing.avg_utilization_improvement += parseFloat(disc.optimal_utilization) - parseFloat(disc.current_utilization);

      // Update urgency based on frequency and savings
      if (existing.orders.length >= 5 && existing.total_savings >= 10) {
        existing.urgency = 'high';
      } else if (existing.orders.length >= 3 || existing.total_savings >= 5) {
        existing.urgency = 'medium';
      }

      groupedOpportunities.set(ulineSku, existing);
    });

    // Convert grouped opportunities to detailed discrepancies for display
    const aggregatedDiscrepancies = Array.from(groupedOpportunities.values()).map(group => ({
      order_id: `${group.orders.length} orders`,
      actual_box: `Current Inventory (Multiple)`,
      optimal_box: `${group.uline_name} (${group.uline_sku})`,
      actual_cube: 'Various',
      optimal_cube: 'Optimized',
      current_utilization: 'Various',
      optimal_utilization: 'Improved',
      cube_reduction: 'Positive',
      material_savings: group.total_savings * 0.7, // Estimate material portion
      shipping_savings: group.total_savings * 0.3, // Estimate shipping portion
      total_savings: group.total_savings,
      confidence: group.orders.length >= 5 ? 95 : group.orders.length >= 3 ? 85 : 75,
      potential_savings: group.total_savings,
      orders_affected: group.orders.length,
      avg_utilization_improvement: group.avg_utilization_improvement / group.orders.length
    })).sort((a, b) => b.total_savings - a.total_savings);

    // Step 7: Compile final inventory suggestions with enhanced data
    const enhancedInventorySuggestions = Array.from(boxRecommendations.values())
      .map(rec => ({
        ...rec,
        urgency: rec.projected_need >= 10 ? 'high' : rec.projected_need >= 5 ? 'medium' : 'low',
        total_potential_savings: groupedOpportunities.get(rec.box_id)?.total_savings || 0
      }))
      .sort((a, b) => {
        // Sort by total potential savings first, then by projected need
        if (a.total_potential_savings !== b.total_potential_savings) {
          return b.total_potential_savings - a.total_potential_savings;
        }
        return b.projected_need - a.projected_need;
      });

    // Step 8: Compile box usage data (focus on actual usage from shipments)
    const combinedBoxUsage: Record<string, { recommended: number, actual: number, total: number }> = {};
    
    Object.entries(boxUsageCount).forEach(([sku, count]) => {
      if (!combinedBoxUsage[sku]) combinedBoxUsage[sku] = { recommended: 0, actual: 0, total: 0 };
      combinedBoxUsage[sku].recommended = count;
      combinedBoxUsage[sku].total += count;
    });
    
    Object.entries(actualBoxUsageCount).forEach(([sku, count]) => {
      if (!combinedBoxUsage[sku]) combinedBoxUsage[sku] = { recommended: 0, actual: 0, total: 0 };
      combinedBoxUsage[sku].actual = count;
      combinedBoxUsage[sku].total += count;
    });

    const report = {
      company_id,
      generated_at: new Date().toISOString(),
      analysis_period: 'Last 30 days',
      total_orders_analyzed: recentOrders?.length || 0,
      potential_savings: totalPotentialSavings,
      top_5_most_used_boxes: Object.entries(combinedBoxUsage)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5)
        .map(([sku, usage]) => ({
          box_sku: sku,
          total_usage: usage.total,
          recommended_usage: usage.recommended,
          actual_usage: usage.actual,
          percentage_of_orders: Math.round((usage.total / Math.max(recentOrders?.length || 1, 1)) * 100)
        })),
      top_5_box_discrepancies: aggregatedDiscrepancies.slice(0, 5),
      inventory_suggestions: enhancedInventorySuggestions.slice(0, 10),
      projected_packaging_need: Object.entries(combinedBoxUsage).reduce((acc, [sku, usage]) => {
        acc[sku] = Math.ceil(usage.total * 1.1);
        return acc;
      }, {} as Record<string, number>),
      report_data: {
        orders_with_current_inventory: orderAnalyses.filter(a => a.companyBoxResult).length,
        orders_needing_new_boxes: unpackageableOrders.length,
        total_discrepancies_found: aggregatedDiscrepancies.length,
        total_orders_with_opportunities: aggregatedDiscrepancies.reduce((sum, d) => sum + (d.orders_affected || 1), 0),
        average_cost_per_discrepancy: aggregatedDiscrepancies.length > 0 
          ? (aggregatedDiscrepancies.reduce((sum, d) => sum + (d.potential_savings || 0), 0) / aggregatedDiscrepancies.length).toFixed(2)
          : 0,
        total_box_recommendations: enhancedInventorySuggestions.length,
        high_impact_opportunities: aggregatedDiscrepancies.filter(d => (d.orders_affected || 0) >= 5).length
      }
    };

    // Step 7: Save Report
    const today = new Date().toISOString().split('T')[0];
    
    const { error: deleteError } = await supabase
      .from('packaging_intelligence_reports')
      .delete()
      .eq('company_id', company_id)
      .gte('generated_at', `${today}T00:00:00Z`)
      .lt('generated_at', `${today}T23:59:59Z`);

    if (deleteError) {
      console.warn('Could not delete existing reports:', deleteError);
    }

    const { error: reportError } = await supabase
      .from('packaging_intelligence_reports')
      .insert([report]);

    if (reportError) {
      console.error('Error saving report:', reportError);
      throw new Error(`Failed to save report: ${reportError.message}`);
    }

    // Step 8: Generate Alerts
    const alerts = [];

    // Alert for orders that can't be packaged
    if (unpackageableOrders.length > 0) {
      alerts.push({
        company_id,
        alert_type: 'missing_inventory',
        message: `📦 INVENTORY OPPORTUNITY: ${unpackageableOrders.length} recent orders can't be packaged with current inventory. Consider adding recommended Uline boxes.`,
        severity: 'warning',
        metadata: { 
          unpackageable_orders: unpackageableOrders.length,
          recommended_boxes: inventorySuggestions.length
        }
      });
    }

    // Alert for potential savings
    if (totalPotentialSavings > 25) {
      alerts.push({
        company_id,
        alert_type: 'cost_opportunity',
        message: `💰 COST OPPORTUNITY: You could save $${totalPotentialSavings.toFixed(2)} by switching to more efficient Uline boxes.`,
        severity: 'info',
        metadata: { potential_savings: totalPotentialSavings }
      });
    }

    // Save alerts
    if (alerts.length > 0) {
      const { error: alertsError } = await supabase
        .from('packaging_alerts')
        .insert(alerts);

      if (alertsError) {
        console.error('Error saving alerts:', alertsError);
      }
    }

    console.log(`Report generated successfully. Found ${alerts.length} alerts.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        report_id: report,
        alerts_created: alerts.length,
        total_savings: totalPotentialSavings,
        orders_analyzed: recentOrders?.length || 0,
        unpackageable_orders: unpackageableOrders.length,
        box_recommendations: inventorySuggestions.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating packaging intelligence:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
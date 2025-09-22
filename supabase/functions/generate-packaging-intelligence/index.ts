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

    // Step 1: Get all recent orders (both historical and current)
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

    console.log(`Found ${recentOrders?.length || 0} recent orders to analyze`);

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
      constructor(private companyBoxes: any[], private ulineBoxes: any[]) {}
      
      analyzeOrder(order: any) {
        const items = Array.isArray(order.items) ? order.items : [];
        if (!items.length) return null;

        // Convert order items to cartonization format
        const cartonItems = items.map((item: any) => {
          const dimensions = item.dimensions || {};
          return {
            name: item.name || 'Unknown Item',
            length: dimensions.length || item.length || 6,
            width: dimensions.width || item.width || 4,  
            height: dimensions.height || item.height || 2,
            weight: (dimensions.weight || item.weight || 8) / 16, // Convert oz to lbs
            quantity: item.quantity || 1,
            category: item.category || 'general'
          };
        });

        const orderWeight = cartonItems.reduce((sum, item) => 
          sum + (item.weight * item.quantity), 0
        );

        // Try company inventory first
        let companyBoxResult = this.findOptimalBox(cartonItems, this.companyBoxes, 'company');
        
        // Try Uline catalog for comparison or if no company box found
        let ulineBoxResult = this.findOptimalBox(cartonItems, this.ulineBoxes, 'uline');

        return {
          order_id: order.order_id,
          items: cartonItems,
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
        
        // Filter boxes that can handle the weight and volume
        const suitableBoxes = boxes.filter(box => {
          const lengthKey = source === 'uline' ? 'length_in' : 'length';
          const widthKey = source === 'uline' ? 'width_in' : 'width';
          const heightKey = source === 'uline' ? 'height_in' : 'height';
          const weightKey = source === 'uline' ? 'weight_oz' : 'max_weight';
          
          const boxVolume = box[lengthKey] * box[widthKey] * box[heightKey];
          const maxWeight = source === 'uline' 
            ? (box[weightKey] ? (box[weightKey] / 16) * 10 : 50)
            : box[weightKey];
          
          return totalWeight <= maxWeight && this.canItemsFit(items, box, source);
        });
        
        if (!suitableBoxes.length) return null;
        
        // Sort by efficiency (cost + volume efficiency)
        const sortedBoxes = suitableBoxes.map(box => {
          const lengthKey = source === 'uline' ? 'length_in' : 'length';
          const widthKey = source === 'uline' ? 'width_in' : 'width';
          const heightKey = source === 'uline' ? 'height_in' : 'height';
          
          const boxVolume = box[lengthKey] * box[widthKey] * box[heightKey];
          const utilization = (totalVolume / boxVolume) * 100;
          const costEfficiency = box.cost / boxVolume;
          
          return {
            ...box,
            utilization,
            costEfficiency,
            boxVolume,
            score: utilization - (costEfficiency * 100) // Higher utilization, lower cost per volume
          };
        }).sort((a, b) => b.score - a.score);
        
        return sortedBoxes[0];
      }
      
      canItemsFit(items: any[], box: any, source: 'company' | 'uline'): boolean {
        const lengthKey = source === 'uline' ? 'length_in' : 'length';
        const widthKey = source === 'uline' ? 'width_in' : 'width';
        const heightKey = source === 'uline' ? 'height_in' : 'height';
        
        // Check if largest item can fit in any orientation
        for (const item of items) {
          const itemDims = [item.length, item.width, item.height].sort((a, b) => b - a);
          const boxDims = [box[lengthKey], box[widthKey], box[heightKey]].sort((a, b) => b - a);
          
          if (itemDims[0] > boxDims[0] || itemDims[1] > boxDims[1] || itemDims[2] > boxDims[2]) {
            return false;
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

    // Step 5: Analyze all orders
    console.log('Analyzing packaging efficiency with enhanced algorithm...');
    
    const engine = new PackagingIntelligenceEngine(companyBoxes || [], availablePackaging || []);
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
      
      // Track what happened with this order
      if (!analysis.companyBoxResult) {
        // Order can't be packaged with company inventory
        unpackageableOrders.push(analysis);
        
        if (analysis.ulineBoxResult) {
          // But can be packaged with Uline box - add to recommendations
          const ulineBox = analysis.ulineBoxResult;
          const sku = ulineBox.vendor_sku;
          
          if (!boxRecommendations.has(sku)) {
            boxRecommendations.set(sku, {
              box_id: sku,
              box_name: ulineBox.name,
              current_stock: 0, // Not in inventory
              projected_need: 0,
              days_of_supply: 0,
              suggestion: `Add ${ulineBox.name} to inventory - needed for ${1} order`,
              urgency: 'medium',
              cost_per_unit: ulineBox.cost,
              orders_needing_this_box: []
            });
          }
          
          const recommendation = boxRecommendations.get(sku)!;
          recommendation.projected_need += 1;
          recommendation.orders_needing_this_box.push(order.order_id);
          recommendation.suggestion = `Add ${ulineBox.name} to inventory - needed for ${recommendation.projected_need} orders`;
          
          if (recommendation.projected_need >= 5) {
            recommendation.urgency = 'high';
          } else if (recommendation.projected_need >= 2) {
            recommendation.urgency = 'medium';
          }
        }
      } else {
        // Order can be packaged with company inventory
        const companySku = analysis.companyBoxResult.sku || analysis.companyBoxResult.name;
        boxUsageCount[companySku] = (boxUsageCount[companySku] || 0) + 1;
        
        // Check if there's a better Uline option
        if (analysis.ulineBoxResult) {
          const savings = engine.calculateSavings(
            analysis.companyBoxResult, 
            analysis.ulineBoxResult,
            analysis.orderWeight,
            'company',
            'uline'
          );
          
          if (savings.totalSavings > 0.25) { // Significant savings
            totalPotentialSavings += savings.totalSavings;
            
            detailedDiscrepancies.push({
              order_id: order.order_id,
              actual_box: `${analysis.companyBoxResult.name} (Current Inventory)`,
              optimal_box: `${analysis.ulineBoxResult.name} (${analysis.ulineBoxResult.vendor_sku})`,
              actual_volume: savings.currentVolume,
              optimal_volume: savings.optimalVolume,
              volume_reduction_percent: savings.volumeReduction,
              material_savings: savings.materialSavings,
              shipping_savings: savings.shippingSavings,
              total_savings: savings.totalSavings,
              confidence: savings.totalSavings > 1.0 ? 95 : 85,
              potential_savings: savings.totalSavings
            });
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

    // Step 6: Compile final report
    const inventorySuggestions = Array.from(boxRecommendations.values())
      .sort((a, b) => b.projected_need - a.projected_need);

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
      top_5_box_discrepancies: detailedDiscrepancies
        .sort((a, b) => (b.potential_savings || 0) - (a.potential_savings || 0))
        .slice(0, 5),
      inventory_suggestions: inventorySuggestions.slice(0, 10),
      projected_packaging_need: Object.entries(combinedBoxUsage).reduce((acc, [sku, usage]) => {
        acc[sku] = Math.ceil(usage.total * 1.1);
        return acc;
      }, {} as Record<string, number>),
      report_data: {
        orders_with_current_inventory: orderAnalyses.filter(a => a.companyBoxResult).length,
        orders_needing_new_boxes: unpackageableOrders.length,
        total_discrepancies_found: detailedDiscrepancies.length,
        average_cost_per_discrepancy: detailedDiscrepancies.length > 0 
          ? (detailedDiscrepancies.reduce((sum, d) => sum + (d.potential_savings || 0), 0) / detailedDiscrepancies.length).toFixed(2)
          : 0,
        total_box_recommendations: inventorySuggestions.length
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
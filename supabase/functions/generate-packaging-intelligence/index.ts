import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShipmentAnalysis {
  shipment_id: string;
  order_id: string;
  actual_box_sku: string;
  actual_utilization: number;
  optimal_box?: any;
  potential_savings: number;
  confidence: number;
  volume_efficiency: number;
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
  shipments_needing_this_box: string[];
  actual_utilization_improvement: number;
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

    console.log(`Generating real shipment performance report for company: ${company_id}`);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Step 1: Get actual shipments with real packaging data
    const { data: recentShipments, error: shipmentsError } = await supabase
      .from('shipments')
      .select(`
        id,
        easypost_id,
        carrier,
        service,
        cost,
        package_dimensions,
        package_weights,
        total_weight,
        actual_package_sku,
        actual_package_master_id,
        created_at,
        orders!left (
          id,
          order_id,
          items,
          company_id
        )
      `)
      .eq('orders.company_id', company_id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .not('actual_package_sku', 'is', null)
      .not('package_dimensions', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200);

    if (shipmentsError) {
      console.error('Error fetching shipments:', shipmentsError);
      throw new Error(`Failed to fetch shipments: ${shipmentsError.message}`);
    }

    console.log(`Found ${recentShipments?.length || 0} recent shipments with actual packaging data`);
    
    if (!recentShipments || recentShipments.length === 0) {
      console.log('No shipments with packaging data found, returning basic report');
      
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
          shipments_with_packaging_data: 0,
          average_actual_utilization: 0,
          total_discrepancies_found: 0,
          total_potential_savings: 0,
          high_efficiency_shipments: 0,
          low_efficiency_shipments: 0
        }
      };

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
          message: 'No shipment data to analyze, basic report generated',
          shipments_analyzed: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Get company's item master data for volume calculations
    const { data: companyItems, error: itemsError } = await supabase
      .from('items')
      .select('id, sku, name, length, width, height, weight, category')
      .eq('company_id', company_id)
      .eq('is_active', true);

    if (itemsError) {
      console.error('Error fetching company items:', itemsError);
      throw new Error(`Failed to fetch company items: ${itemsError.message}`);
    }

    const itemsMap = new Map(companyItems?.map(item => [item.id, item]) || []);
    console.log(`Found ${companyItems?.length || 0} items in company master data`);

    // Step 3: Get Uline packaging options for comparison
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

    // Step 4: Real Shipment Performance Analysis Engine
    class RealShipmentAnalysisEngine {
      constructor(private ulineBoxes: any[], private itemsMap: Map<string, any>) {}
      
      analyzeShipment(shipment: any) {
        if (!shipment.actual_package_sku || !shipment.package_dimensions) {
          return null;
        }

        // Parse package dimensions (assuming format like [{"length": 12, "width": 10, "height": 8}])
        const packageDim = Array.isArray(shipment.package_dimensions) 
          ? shipment.package_dimensions[0] 
          : shipment.package_dimensions;
        
        if (!packageDim || !packageDim.length || !packageDim.width || !packageDim.height) {
          return null;
        }

        const actualBoxVolume = packageDim.length * packageDim.width * packageDim.height;
        
        // Calculate items volume from order
        const order = shipment.orders;
        if (!order || !order.items) return null;

        const itemsVolume = this.calculateItemsVolume(order.items);
        const actualUtilization = itemsVolume > 0 ? (itemsVolume / actualBoxVolume) * 100 : 0;

        console.log(`📦 Shipment ${shipment.id}: Box ${shipment.actual_package_sku}, ${actualUtilization.toFixed(1)}% utilization`);

        // Find better Uline options with higher utilization (but <100%)
        const betterOptions = this.findBetterUlineOptions(itemsVolume, actualBoxVolume, actualUtilization, shipment.total_weight || 5);
        
        return {
          shipment_id: shipment.id.toString(),
          order_id: order.order_id || order.id.toString(),
          actual_box_sku: shipment.actual_package_sku,
          actual_box_volume: actualBoxVolume,
          items_volume: itemsVolume,
          actual_utilization: actualUtilization,
          actual_weight: shipment.total_weight || 5,
          better_options: betterOptions,
          package_cost: shipment.cost || 0
        };
      }
      
      calculateItemsVolume(items: any[]): number {
        if (!Array.isArray(items)) return 0;
        
        return items.reduce((totalVolume, orderItem) => {
          const masterItem = this.itemsMap.get(orderItem.itemId);
          
          if (masterItem) {
            const itemVolume = Number(masterItem.length || 6) * 
                              Number(masterItem.width || 4) * 
                              Number(masterItem.height || 2);
            return totalVolume + (itemVolume * (orderItem.quantity || 1));
          } else {
            // Fallback: estimate item volume based on common scenarios
            const estimatedVolume = 48; // 6x4x2 inches default
            return totalVolume + (estimatedVolume * (orderItem.quantity || 1));
          }
        }, 0);
      }
      
      findBetterUlineOptions(itemsVolume: number, currentBoxVolume: number, currentUtilization: number, weight: number) {
        console.log(`🔍 Looking for better boxes for ${itemsVolume.toFixed(2)} cubic inches (current: ${currentUtilization.toFixed(1)}% utilization)`);
        
        const candidates = this.ulineBoxes.filter(box => {
          const boxVolume = box.length_in * box.width_in * box.height_in;
          const utilization = (itemsVolume / boxVolume) * 100;
          
          // Must fit items, have better utilization, but less than 100%
          return boxVolume >= itemsVolume * 1.05 && // 5% packing buffer
                 utilization > currentUtilization + 5 && // At least 5% better
                 utilization < 98 && // Leave some space
                 boxVolume < currentBoxVolume; // Must be smaller than current box
        });

        return candidates.map(box => {
          const boxVolume = box.length_in * box.width_in * box.height_in;
          const utilization = (itemsVolume / boxVolume) * 100;
          const volumeReduction = ((currentBoxVolume - boxVolume) / currentBoxVolume) * 100;
          
          // Calculate savings
          const dimWeightFactor = 139;
          const currentDimWeight = currentBoxVolume / dimWeightFactor;
          const newDimWeight = boxVolume / dimWeightFactor;
          const shippingSavings = Math.max(0, (currentDimWeight - newDimWeight) * 0.15); // $0.15 per lb
          const materialSavings = 0; // Assume no material cost difference for now
          
          console.log(`✅ Better option: ${box.vendor_sku} (${utilization.toFixed(1)}% utilization, ${volumeReduction.toFixed(1)}% volume reduction)`);
          
          return {
            box: box,
            utilization: utilization,
            volume_reduction: volumeReduction,
            potential_shipping_savings: shippingSavings,
            potential_material_savings: materialSavings,
            total_savings: shippingSavings + materialSavings,
            confidence: utilization > 75 ? 95 : utilization > 60 ? 85 : 75
          };
        }).sort((a, b) => b.utilization - a.utilization);
      }
    }

    // Step 5: Analyze all shipments with real performance data
    console.log('Analyzing real shipment performance...');
    
    const engine = new RealShipmentAnalysisEngine(availablePackaging || [], itemsMap);
    const shipmentAnalyses: any[] = [];
    const boxUsageCount: Record<string, number> = {};
    const utilizationData: number[] = [];
    const detailedDiscrepancies: any[] = [];
    let totalPotentialSavings = 0;

    for (const shipment of recentShipments || []) {
      const analysis = engine.analyzeShipment(shipment);
      if (!analysis) continue;
      
      shipmentAnalyses.push(analysis);
      utilizationData.push(analysis.actual_utilization);
      
      // Track box usage
      boxUsageCount[analysis.actual_box_sku] = (boxUsageCount[analysis.actual_box_sku] || 0) + 1;
      
      // Check for better options
      if (analysis.better_options && analysis.better_options.length > 0) {
        const bestOption = analysis.better_options[0];
        
        if (bestOption.total_savings > 0.05) { // Minimum $0.05 savings threshold
          totalPotentialSavings += bestOption.total_savings;
          
          detailedDiscrepancies.push({
            shipment_id: analysis.shipment_id,
            order_id: analysis.order_id,
            actual_box: analysis.actual_box_sku,
            optimal_box: `${bestOption.box.name} (${bestOption.box.vendor_sku})`,
            actual_utilization: analysis.actual_utilization.toFixed(1),
            optimal_utilization: bestOption.utilization.toFixed(1),
            utilization_improvement: (bestOption.utilization - analysis.actual_utilization).toFixed(1),
            volume_reduction: bestOption.volume_reduction.toFixed(1),
            current_box_volume: analysis.actual_box_volume.toFixed(2),
            optimal_box_volume: (bestOption.box.length_in * bestOption.box.width_in * bestOption.box.height_in).toFixed(2),
            potential_savings: bestOption.total_savings,
            confidence: bestOption.confidence,
            shipping_cost_current: analysis.package_cost || 0
          });
          
          console.log(`💰 Savings opportunity: ${analysis.actual_box_sku} → ${bestOption.box.vendor_sku} saves $${bestOption.total_savings.toFixed(2)}`);
        }
      }
    }

    console.log(`Analyzed ${shipmentAnalyses.length} shipments with packaging data`);
    console.log(`Found ${detailedDiscrepancies.length} optimization opportunities`);

    // Step 6: Calculate performance metrics
    const averageUtilization = utilizationData.length > 0 
      ? utilizationData.reduce((sum, util) => sum + util, 0) / utilizationData.length 
      : 0;
    
    const highEfficiencyShipments = utilizationData.filter(util => util >= 75).length;
    const lowEfficiencyShipments = utilizationData.filter(util => util < 50).length;

    // Step 7: Generate inventory suggestions based on frequency and savings
    const boxRecommendations: Map<string, InventorySuggestion> = new Map();
    
    detailedDiscrepancies.forEach(disc => {
      const optimalBoxSku = disc.optimal_box.split('(')[1]?.replace(')', '') || disc.optimal_box;
      const optimalBoxName = disc.optimal_box.split(' (')[0] || disc.optimal_box;
      
      if (!boxRecommendations.has(optimalBoxSku)) {
        boxRecommendations.set(optimalBoxSku, {
          box_id: optimalBoxSku,
          box_name: optimalBoxName,
          current_stock: 0,
          projected_need: 0,
          days_of_supply: 0,
          suggestion: `Consider adding ${optimalBoxName}`,
          urgency: 'low',
          cost_per_unit: 0,
          shipments_needing_this_box: [],
          actual_utilization_improvement: 0
        });
      }
      
      const rec = boxRecommendations.get(optimalBoxSku)!;
      rec.projected_need += 1;
      rec.shipments_needing_this_box.push(disc.shipment_id);
      rec.actual_utilization_improvement += parseFloat(disc.utilization_improvement);
      
      // Set urgency based on frequency and impact
      if (rec.projected_need >= 10) {
        rec.urgency = 'high';
        rec.suggestion = `HIGH PRIORITY: Add ${optimalBoxName} - would optimize ${rec.projected_need} shipments`;
      } else if (rec.projected_need >= 5) {
        rec.urgency = 'medium';
        rec.suggestion = `MEDIUM PRIORITY: Add ${optimalBoxName} - would optimize ${rec.projected_need} shipments`;
      } else {
        rec.suggestion = `Consider adding ${optimalBoxName} - would optimize ${rec.projected_need} shipments`;
      }
    });

    // Step 8: Compile final report
    const report = {
      company_id,
      generated_at: new Date().toISOString(),
      analysis_period: 'Last 30 days',
      total_orders_analyzed: shipmentAnalyses.length,
      potential_savings: totalPotentialSavings,
      top_5_most_used_boxes: Object.entries(boxUsageCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([sku, count]) => ({
          box_sku: sku,
          usage_count: count,
          percentage_of_shipments: Math.round((count / Math.max(shipmentAnalyses.length, 1)) * 100)
        })),
      top_5_box_discrepancies: detailedDiscrepancies
        .sort((a, b) => b.potential_savings - a.potential_savings)
        .slice(0, 5),
      inventory_suggestions: Array.from(boxRecommendations.values())
        .sort((a, b) => b.projected_need - a.projected_need)
        .slice(0, 10),
      projected_packaging_need: Object.entries(boxUsageCount).reduce((acc, [sku, count]) => {
        acc[sku] = Math.ceil(count * 1.2); // 20% buffer
        return acc;
      }, {} as Record<string, number>),
      report_data: {
        shipments_with_packaging_data: shipmentAnalyses.length,
        average_actual_utilization: averageUtilization.toFixed(1),
        total_discrepancies_found: detailedDiscrepancies.length,
        total_potential_savings: totalPotentialSavings.toFixed(2),
        high_efficiency_shipments: highEfficiencyShipments,
        low_efficiency_shipments: lowEfficiencyShipments,
        utilization_distribution: {
          excellent: utilizationData.filter(u => u >= 85).length,
          good: utilizationData.filter(u => u >= 70 && u < 85).length,
          fair: utilizationData.filter(u => u >= 50 && u < 70).length,
          poor: utilizationData.filter(u => u < 50).length
        }
      }
    };

    // Step 9: Save Report (replace any existing reports from today)
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

    // Step 10: Generate Performance Alerts
    const alerts = [];

    // Alert for low average utilization
    if (averageUtilization < 60) {
      alerts.push({
        company_id,
        alert_type: 'low_efficiency',
        message: `📊 EFFICIENCY ALERT: Your average packaging utilization is ${averageUtilization.toFixed(1)}%. Consider optimizing box selection.`,
        severity: 'warning',
        metadata: { 
          average_utilization: averageUtilization,
          low_efficiency_shipments: lowEfficiencyShipments
        }
      });
    }

    // Alert for significant savings opportunity
    if (totalPotentialSavings > 50) {
      alerts.push({
        company_id,
        alert_type: 'savings_opportunity',
        message: `💰 MAJOR SAVINGS: Based on actual shipment data, you could save $${totalPotentialSavings.toFixed(2)} by optimizing packaging choices.`,
        severity: 'info',
        metadata: { 
          potential_savings: totalPotentialSavings,
          opportunities_count: detailedDiscrepancies.length
        }
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

    console.log(`Real performance report generated successfully. Found ${alerts.length} alerts.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        report_id: report,
        alerts_created: alerts.length,
        total_savings: totalPotentialSavings,
        shipments_analyzed: shipmentAnalyses.length,
        average_utilization: averageUtilization,
        optimization_opportunities: detailedDiscrepancies.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating real shipment intelligence:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
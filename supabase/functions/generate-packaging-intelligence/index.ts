import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Calculate utilization percentage for items in a box
function calculateBoxUtilization(items: any[], boxLength: number, boxWidth: number, boxHeight: number): { fits: boolean, utilization: number, itemsVolumeCubicFt: number, boxVolumeCubicFt: number } {
  let totalItemVolume = 0;
  
  // Calculate total volume of all items in cubic inches
  for (const item of items) {
    if (item.dimensions) {
      const itemVol = (item.dimensions.length || 6) * 
                     (item.dimensions.width || 4) * 
                     (item.dimensions.height || 2);
      totalItemVolume += itemVol * (item.quantity || 1);
    }
  }
  
  // Calculate box volume in cubic inches
  const boxVolume = boxLength * boxWidth * boxHeight;
  
  // Convert to cubic feet (1728 cubic inches = 1 cubic foot)
  const itemsVolumeCubicFt = totalItemVolume / 1728;
  const boxVolumeCubicFt = boxVolume / 1728;
  
  // Calculate utilization percentage
  const utilization = totalItemVolume > 0 && boxVolume > 0 ? (totalItemVolume / boxVolume) * 100 : 0;
  
  // Items fit if volume doesn't exceed box volume
  const fits = totalItemVolume <= boxVolume && utilization <= 100;
  
  return {
    fits,
    utilization,
    itemsVolumeCubicFt,
    boxVolumeCubicFt
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id } = await req.json();
    console.log('🎯 Generating packaging intelligence for company:', company_id);

    if (!company_id) {
      throw new Error('Company ID is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get shipments from the last 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    console.log('📅 Looking for shipments after:', sixtyDaysAgo.toISOString());

    // Get all shipments with package data
    const { data: allShipments, error: shipmentsError } = await supabase
      .from('shipments')
      .select('id, created_at, actual_package_sku, package_dimensions, cost, total_weight')
      .not('actual_package_sku', 'is', null)
      .not('package_dimensions', 'is', null)
      .gte('created_at', sixtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(200);

    console.log(`📦 Found ${allShipments?.length || 0} total shipments with packaging data`);
    
    if (shipmentsError) {
      console.error('❌ Shipments query error:', shipmentsError);
      throw new Error(`Shipments query failed: ${shipmentsError.message}`);
    }

    // Get orders that match these shipments for the company
    let matchedShipments = [];
    if (allShipments && allShipments.length > 0) {
      const shipmentIds = allShipments.map(s => s.id);
      
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_id, items, company_id, shipment_id')
        .eq('company_id', company_id)
        .in('shipment_id', shipmentIds);

      console.log(`📋 Found ${orders?.length || 0} orders for company ${company_id}`);

      if (ordersError) {
        console.error('❌ Orders query error:', ordersError);
        throw new Error(`Orders query failed: ${ordersError.message}`);
      }

      // Match shipments with orders
      for (const shipment of allShipments) {
        const order = orders?.find(o => o.shipment_id === shipment.id);
        if (order) {
          matchedShipments.push({
            shipment_id: shipment.id,
            order_id: order.order_id,
            actual_package_sku: shipment.actual_package_sku,
            package_dimensions: shipment.package_dimensions,
            cost: shipment.cost,
            items_count: order.items?.length || 0,
            has_items: !!order.items,
            created_at: shipment.created_at,
            order_items: order.items
          });
        }
      }
    }

    console.log(`✅ Matched ${matchedShipments.length} shipments with orders`);

    // Get ALL active boxes from packaging_master_list (not just company boxes)
    const { data: masterListBoxes, error: masterError } = await supabase
      .from('packaging_master_list')
      .select('id, name, vendor_sku, length_in, width_in, height_in, cost, vendor, type')
      .eq('is_active', true)
      .eq('type', 'box')
      .order('cost', { ascending: true });

    if (masterError) {
      console.error('❌ Master list query error:', masterError);
      throw new Error(`Master list query failed: ${masterError.message}`);
    }

    console.log(`📦 Found ${masterListBoxes?.length || 0} boxes in master list`);

    // Analyze each matched shipment for optimization opportunities
    const masterBoxOpportunities: Record<string, {
      master_box_sku: string;
      master_box_name: string;
      master_box_vendor: string;
      master_box_cost: number;
      shipments: Array<{
        shipment_id: number;
        order_id: string;
        current_box_sku: string;
        current_utilization: number;
        new_utilization: number;
        improvement: number;
      }>;
      total_improvement: number;
      avg_current_utilization: number;
      avg_new_utilization: number;
    }> = {};

    let totalUtilization = 0;
    let utilizationCount = 0;
    let allAnalysisResults = [];

    console.log('🔬 Starting detailed analysis of', matchedShipments.length, 'matched shipments');

    for (const shipment of matchedShipments) {
      if (!shipment.order_items || shipment.order_items.length === 0) {
        console.log('⚠️ Skipping shipment with no items');
        continue;
      }

      // Parse actual package dimensions
      let actualDims;
      try {
        if (typeof shipment.package_dimensions === 'string') {
          actualDims = JSON.parse(shipment.package_dimensions);
        } else {
          actualDims = shipment.package_dimensions;
        }
      } catch (e) {
        console.log('❌ Failed to parse package dimensions for shipment', shipment.shipment_id);
        continue;
      }

      if (!actualDims || !actualDims.length || !actualDims.width || !actualDims.height) {
        console.log('⚠️ Skipping shipment due to invalid dimensions');
        continue;
      }

      // Calculate actual utilization using the box that was actually used
      const actualBoxUtilization = calculateBoxUtilization(
        shipment.order_items,
        parseFloat(actualDims.length),
        parseFloat(actualDims.width), 
        parseFloat(actualDims.height)
      );

      console.log(`📊 Shipment ${shipment.shipment_id}: Actual utilization ${actualBoxUtilization.utilization.toFixed(1)}%`);

      if (actualBoxUtilization.utilization > 0) {
        totalUtilization += actualBoxUtilization.utilization;
        utilizationCount++;
      }

      // Find master list boxes that would provide BETTER utilization
      let bestMasterBox = null;
      let bestMasterUtilization = actualBoxUtilization.utilization;

      for (const masterBox of (masterListBoxes || [])) {
        const masterBoxUtilization = calculateBoxUtilization(
          shipment.order_items,
          masterBox.length_in,
          masterBox.width_in,
          masterBox.height_in
        );
        
        // We want boxes that:
        // 1. Items fit (utilization <= 95% for safety margin)
        // 2. Provide HIGHER utilization than actual
        // 3. Are closer to 100% utilization (but not over)
        if (masterBoxUtilization.fits && 
            masterBoxUtilization.utilization > actualBoxUtilization.utilization && 
            masterBoxUtilization.utilization <= 95 &&
            masterBoxUtilization.utilization > bestMasterUtilization) {
          bestMasterUtilization = masterBoxUtilization.utilization;
          bestMasterBox = {
            ...masterBox,
            utilization: masterBoxUtilization.utilization
          };
        }
      }

      // If we found a better box, track it
      if (bestMasterBox) {
        const improvement = bestMasterUtilization - actualBoxUtilization.utilization;
        console.log(`✨ Found opportunity: ${bestMasterBox.vendor_sku} - ${bestMasterUtilization.toFixed(1)}% vs ${actualBoxUtilization.utilization.toFixed(1)}%`);
        
        const key = bestMasterBox.vendor_sku;
        if (!masterBoxOpportunities[key]) {
          masterBoxOpportunities[key] = {
            master_box_sku: bestMasterBox.vendor_sku,
            master_box_name: bestMasterBox.name,
            master_box_vendor: bestMasterBox.vendor,
            master_box_cost: bestMasterBox.cost,
            shipments: [],
            total_improvement: 0,
            avg_current_utilization: 0,
            avg_new_utilization: 0
          };
        }

        masterBoxOpportunities[key].shipments.push({
          shipment_id: shipment.shipment_id,
          order_id: shipment.order_id,
          current_box_sku: shipment.actual_package_sku,
          current_utilization: actualBoxUtilization.utilization,
          new_utilization: bestMasterUtilization,
          improvement: improvement
        });
        masterBoxOpportunities[key].total_improvement += improvement;
      }

      allAnalysisResults.push({
        shipment_id: shipment.shipment_id,
        order_id: shipment.order_id,
        actual_utilization: actualBoxUtilization.utilization,
        has_opportunity: !!bestMasterBox
      });
    }

    // Calculate averages and sort opportunities
    const topOpportunities = Object.values(masterBoxOpportunities)
      .map(opp => {
        const totalCurrentUtil = opp.shipments.reduce((sum, s) => sum + s.current_utilization, 0);
        const totalNewUtil = opp.shipments.reduce((sum, s) => sum + s.new_utilization, 0);
        
        return {
          master_box_sku: opp.master_box_sku,
          master_box_name: opp.master_box_name,
          master_box_vendor: opp.master_box_vendor,
          master_box_cost: opp.master_box_cost,
          shipment_count: opp.shipments.length,
          avg_current_utilization: (totalCurrentUtil / opp.shipments.length).toFixed(1),
          avg_new_utilization: (totalNewUtil / opp.shipments.length).toFixed(1),
          avg_improvement: (opp.total_improvement / opp.shipments.length).toFixed(1),
          total_savings: parseFloat((opp.total_improvement * 0.10).toFixed(2)), // Estimate savings
          sample_shipments: opp.shipments.slice(0, 3).map(s => s.shipment_id)
        };
      })
      .sort((a, b) => b.shipment_count - a.shipment_count)
      .slice(0, 10);

    console.log(`✨ Found ${topOpportunities.length} packaging opportunities`);

    const averageUtilization = utilizationCount > 0 ? totalUtilization / utilizationCount : 0;

    // Calculate most used boxes
    const boxUsage: Record<string, number> = {};
    matchedShipments.forEach(shipment => {
      const sku = shipment.actual_package_sku;
      if (sku) {
        boxUsage[sku] = (boxUsage[sku] || 0) + 1;
      }
    });

    const mostUsedBoxes = Object.entries(boxUsage)
      .map(([sku, count]) => ({
        box_sku: sku,
        usage_count: count,
        percentage_of_shipments: ((count / matchedShipments.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 5);

    // Generate report
    const totalPotentialSavings = topOpportunities.reduce((sum, opp) => sum + opp.total_savings, 0);
    
    const report = {
      company_id,
      generated_at: new Date().toISOString(),
      analysis_period: 'Last 60 days',
      total_orders_analyzed: matchedShipments.length,
      potential_savings: parseFloat(totalPotentialSavings.toFixed(2)),
      top_5_most_used_boxes: mostUsedBoxes,
      top_5_box_discrepancies: topOpportunities,
      inventory_suggestions: topOpportunities.slice(0, 5),
      projected_packaging_need: mostUsedBoxes.reduce((acc, box) => {
        acc[box.box_sku] = Math.ceil(box.usage_count * 2);
        return acc;
      }, {}),
      report_data: {
        shipments_with_packaging_data: matchedShipments.length,
        average_actual_utilization: averageUtilization.toFixed(1),
        optimization_opportunities: topOpportunities.length,
        total_potential_savings: totalPotentialSavings.toFixed(2),
        high_efficiency_shipments: allAnalysisResults.filter(r => r.actual_utilization >= 75).length,
        low_efficiency_shipments: allAnalysisResults.filter(r => r.actual_utilization < 50).length,
        shipments_with_opportunities: allAnalysisResults.filter(r => r.has_opportunity).length,
        utilization_distribution: {
          excellent: allAnalysisResults.filter(r => r.actual_utilization >= 85).length,
          good: allAnalysisResults.filter(r => r.actual_utilization >= 70 && r.actual_utilization < 85).length,
          fair: allAnalysisResults.filter(r => r.actual_utilization >= 50 && r.actual_utilization < 70).length,
          poor: allAnalysisResults.filter(r => r.actual_utilization < 50).length
        }
      }
    };

    // Delete existing reports from today
    const today = new Date().toISOString().split('T')[0];
    
    await supabase
      .from('packaging_intelligence_reports')
      .delete()
      .eq('company_id', company_id)
      .gte('generated_at', `${today}T00:00:00Z`)
      .lt('generated_at', `${today}T23:59:59Z`);

    const { error: reportError } = await supabase
      .from('packaging_intelligence_reports')
      .insert([report]);

    if (reportError) {
      console.error('❌ Report save error:', reportError);
      throw new Error(`Failed to save report: ${reportError.message}`);
    }

    console.log('✅ Report generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        shipments_analyzed: matchedShipments.length,
        total_savings: totalPotentialSavings,
        average_utilization: averageUtilization,
        optimization_opportunities: topOpportunities.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

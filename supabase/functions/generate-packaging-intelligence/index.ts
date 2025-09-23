import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Simple 3D bin packing logic for better utilization calculation
function calculateBoxFit(items: any[], boxLength: number, boxWidth: number, boxHeight: number): { fits: boolean, utilization: number, itemsVolume: number, boxVolume: number } {
  let totalItemVolume = 0;
  
  // Calculate total volume of all items
  for (const item of items) {
    if (item.dimensions) {
      const itemVol = (item.dimensions.length || 6) * 
                     (item.dimensions.width || 4) * 
                     (item.dimensions.height || 2);
      totalItemVolume += itemVol * (item.quantity || 1);
    }
  }
  
  const boxVolume = boxLength * boxWidth * boxHeight;
  const utilization = totalItemVolume > 0 && boxVolume > 0 ? (totalItemVolume / boxVolume) * 100 : 0;
  
  // Basic fit check - items volume should not exceed box volume
  const fits = totalItemVolume <= boxVolume && utilization <= 100;
  
  return {
    fits,
    utilization,
    itemsVolume: totalItemVolume,
    boxVolume
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

    // Get all shipments with package data first
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
      console.log('🔍 Checking for orders with shipment IDs:', shipmentIds.slice(0, 5));
      
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

      // Match them up
      for (const shipment of allShipments) {
        const order = orders?.find(o => o.shipment_id === shipment.id);
        if (order) {
          matchedShipments.push({
            shipment_id: shipment.id,
            order_id: order.order_id,
            actual_package_sku: shipment.actual_package_sku,
            package_dimensions: shipment.package_dimensions,
            items_count: order.items?.length || 0,
            has_items: !!order.items,
            created_at: shipment.created_at,
            order_items: order.items
          });
        }
      }
    }

    console.log(`✅ Matched ${matchedShipments.length} shipments with orders`);

    // Get company's available boxes AND Uline catalog for recommendations
    const { data: availableBoxes } = await supabase
      .from('boxes')
      .select('id, name, length, width, height, max_weight, cost, in_stock')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .order('cost', { ascending: true });

    const { data: ulineBoxes } = await supabase
      .from('packaging_master_list')
      .select('id, name, length_in, width_in, height_in, cost, vendor_sku, type')
      .eq('is_active', true)
      .eq('type', 'box')
      .order('cost', { ascending: true })
      .limit(100);

    const allAvailableBoxes = [
      ...(availableBoxes || []).map(box => ({
        ...box,
        source: 'company',
        length: box.length,
        width: box.width,
        height: box.height
      })),
      ...(ulineBoxes || []).map(box => ({
        ...box,
        source: 'uline',
        length: box.length_in,
        width: box.width_in,
        height: box.height_in,
        in_stock: 999 // Assume Uline has stock
      }))
    ];

    console.log(`📦 Found ${availableBoxes?.length || 0} company boxes and ${ulineBoxes?.length || 0} Uline boxes`);

    // Analyze ALL matched shipments for Uline optimization opportunities
    let allAnalysisResults = [];
    let totalUtilization = 0;
    let utilizationCount = 0;

    console.log('🔬 Starting detailed analysis of', matchedShipments.length, 'matched shipments');

    for (const shipment of matchedShipments) {
      console.log(`🧪 Analyzing shipment: ${shipment.shipment_id}, SKU: "${shipment.actual_package_sku}", items: ${shipment.order_items?.length || 0}`);
      
      if (shipment.order_items && shipment.order_items.length > 0) {
        // Parse actual package dimensions that were used
        let actualDims;
        try {
          if (typeof shipment.package_dimensions === 'string') {
            actualDims = JSON.parse(shipment.package_dimensions);
          } else {
            actualDims = shipment.package_dimensions;
          }
        } catch (e) {
          console.log('❌ Failed to parse package dimensions for shipment', shipment.shipment_id);
          actualDims = null;
        }

        if (!actualDims || !actualDims.length || !actualDims.width || !actualDims.height) {
          console.log('⚠️ Skipping shipment due to invalid dimensions');
          continue;
        }

        // Calculate actual utilization using the box that was actually used
        const actualBoxFit = calculateBoxFit(
          shipment.order_items,
          parseFloat(actualDims.length),
          parseFloat(actualDims.width), 
          parseFloat(actualDims.height)
        );

        console.log(`📊 Actual utilization: ${actualBoxFit.utilization.toFixed(1)}% (${actualBoxFit.itemsVolume}/${actualBoxFit.boxVolume})`);

        if (actualBoxFit.utilization > 0) {
          totalUtilization += actualBoxFit.utilization;
          utilizationCount++;
        }

        // Now find Uline boxes that would provide HIGHER utilization but still under 100%
        let bestUlineAlternative = null;
        let bestUlineUtilization = actualBoxFit.utilization; // Must beat the actual utilization

        // Focus specifically on Uline boxes for alternatives
        const ulineAlternatives = allAvailableBoxes.filter(box => box.source === 'uline');
        console.log(`🔍 Checking ${ulineAlternatives.length} Uline alternatives against actual utilization of ${actualBoxFit.utilization.toFixed(1)}%`);
        
        for (const ulineBox of ulineAlternatives) {
          const ulineBoxFit = calculateBoxFit(
            shipment.order_items,
            ulineBox.length,
            ulineBox.width,
            ulineBox.height
          );
          
          // We want Uline boxes that:
          // 1. Items actually fit (utilization <= 95% for safety)
          // 2. Provide HIGHER utilization than what was actually used
          // 3. Are not overpacked (< 95% utilization for safety)
          if (ulineBoxFit.fits && 
              ulineBoxFit.utilization > actualBoxFit.utilization && 
              ulineBoxFit.utilization <= 95 &&
              ulineBoxFit.utilization > bestUlineUtilization) {
            bestUlineUtilization = ulineBoxFit.utilization;
            bestUlineAlternative = {
              ...ulineBox,
              fit_analysis: ulineBoxFit
            };
          }
        }

        if (bestUlineAlternative) {
          console.log(`✨ Found Uline optimization: ${bestUlineAlternative.name} (${bestUlineAlternative.vendor_sku}) - ${bestUlineUtilization.toFixed(1)}% vs ${actualBoxFit.utilization.toFixed(1)}%`);
        }

        // Store analysis results
        allAnalysisResults.push({
          shipment_id: shipment.shipment_id,
          order_id: shipment.order_id,
          actual_box_sku: shipment.actual_package_sku,
          actual_utilization: actualBoxFit.utilization,
          actual_box_dimensions: actualDims,
          items_analyzed: shipment.order_items.length,
          items_volume: actualBoxFit.itemsVolume,
          actual_box_volume: actualBoxFit.boxVolume,
          uline_alternative: bestUlineAlternative,
          uline_utilization: bestUlineUtilization,
          has_optimization_opportunity: !!bestUlineAlternative
        });
      }
    }

    const averageUtilization = utilizationCount > 0 ? totalUtilization / utilizationCount : 0;
    console.log(`📊 Analyzed ${allAnalysisResults.length} shipments with average utilization: ${averageUtilization.toFixed(1)}%`);

    // Calculate most used boxes from all matched shipments
    const boxUsage = {};
    console.log('📦 Calculating box usage from', matchedShipments.length, 'shipments');
    
    matchedShipments.forEach((shipment, index) => {
      const sku = shipment.actual_package_sku;
      console.log(`📦 Shipment ${index + 1}: SKU="${sku}"`);
      if (sku) {
        boxUsage[sku] = (boxUsage[sku] || 0) + 1;
      }
    });
    
    console.log('📊 Final box usage counts:', boxUsage);

    const mostUsedBoxes = Object.entries(boxUsage)
      .map(([sku, count]) => ({
        box_sku: sku,
        usage_count: count,
        percentage_of_shipments: ((count / matchedShipments.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 5);

    console.log('📊 Most used boxes:', mostUsedBoxes);

    // Get top Uline optimization opportunities
    const ulineOptimizations = allAnalysisResults
      .filter(result => result.has_optimization_opportunity && result.uline_alternative)
      .sort((a, b) => (b.uline_utilization - b.actual_utilization) - (a.uline_utilization - a.actual_utilization))
      .slice(0, 10)
      .map(result => ({
        shipment_id: result.shipment_id,
        order_id: result.order_id,
        actual_box: result.actual_box_sku,
        actual_utilization: result.actual_utilization.toFixed(1),
        recommended_uline_box: `${result.uline_alternative.name} (${result.uline_alternative.vendor_sku})`,
        recommended_utilization: result.uline_utilization.toFixed(1),
        utilization_improvement: (result.uline_utilization - result.actual_utilization).toFixed(1),
        potential_cost_savings: parseFloat(((result.uline_utilization - result.actual_utilization) * 0.05).toFixed(2)),
        confidence: 85,
        uline_box_cost: result.uline_alternative.cost,
        optimization_type: 'Uline Alternative'
      }));

    console.log(`✨ Found ${ulineOptimizations.length} Uline optimization opportunities`);

    // Get inventory suggestions based on Uline alternatives that were recommended
    const ulineRecommendationCounts = {};
    ulineOptimizations.forEach(opt => {
      const key = opt.recommended_uline_box;
      if (!ulineRecommendationCounts[key]) {
        ulineRecommendationCounts[key] = {
          box_name: key,
          count: 0,
          total_improvement: 0,
          shipments: []
        };
      }
      ulineRecommendationCounts[key].count++;
      ulineRecommendationCounts[key].total_improvement += parseFloat(opt.utilization_improvement);
      ulineRecommendationCounts[key].shipments.push(opt.shipment_id);
    });

    const inventorySuggestions = Object.values(ulineRecommendationCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => ({
        box_name: item.box_name,
        shipments_that_could_benefit: item.count,
        average_utilization_improvement: (item.total_improvement / item.count).toFixed(1),
        projected_monthly_need: Math.ceil(item.count * 2),
        suggestion: `${item.count} recent shipments could benefit from this Uline box`,
        urgency: item.count >= 3 ? "high" : item.count >= 2 ? "medium" : "low",
        total_potential_improvement: item.total_improvement.toFixed(1),
        affected_shipments: item.shipments.slice(0, 5)
      }));

    // Generate and save the report  
    const totalPotentialSavings = ulineOptimizations.reduce((sum, opt) => sum + opt.potential_cost_savings, 0);
    
    const report = {
      company_id,
      generated_at: new Date().toISOString(),
      analysis_period: 'Last 60 days',
      total_orders_analyzed: matchedShipments.length,
      potential_savings: parseFloat(totalPotentialSavings.toFixed(2)),
      top_5_most_used_boxes: mostUsedBoxes,
      top_5_box_discrepancies: ulineOptimizations,
      inventory_suggestions: inventorySuggestions,
      projected_packaging_need: mostUsedBoxes.reduce((acc, box) => {
        acc[box.box_sku] = Math.ceil(box.usage_count * 2);
        return acc;
      }, {}),
      report_data: {
        shipments_with_packaging_data: matchedShipments.length,
        average_actual_utilization: averageUtilization.toFixed(1),
        uline_optimization_opportunities: ulineOptimizations.length,
        total_potential_savings: totalPotentialSavings.toFixed(2),
        high_efficiency_shipments: allAnalysisResults.filter(r => r.actual_utilization >= 75).length,
        low_efficiency_shipments: allAnalysisResults.filter(r => r.actual_utilization < 50).length,
        shipments_with_uline_alternatives: allAnalysisResults.filter(r => r.has_optimization_opportunity).length,
        utilization_distribution: {
          excellent: allAnalysisResults.filter(r => r.actual_utilization >= 85).length,
          good: allAnalysisResults.filter(r => r.actual_utilization >= 70 && r.actual_utilization < 85).length,
          fair: allAnalysisResults.filter(r => r.actual_utilization >= 50 && r.actual_utilization < 70).length,
          poor: allAnalysisResults.filter(r => r.actual_utilization < 50).length
        }
      }
    };

    // Delete any existing reports from today and save the new one
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

    console.log('✅ Report generated successfully with', matchedShipments.length, 'analyzed shipments');

    return new Response(
      JSON.stringify({ 
        success: true,
        debug_info: {
          total_shipments_found: allShipments?.length || 0,
          matched_company_shipments: matchedShipments.length,
          analyzed_results: allAnalysisResults.length,
          average_utilization: averageUtilization,
          uline_boxes_available: ulineBoxes?.length || 0,
          company_boxes_available: availableBoxes?.length || 0
        },
        shipments_analyzed: matchedShipments.length,
        total_savings: totalPotentialSavings,
        average_utilization: averageUtilization,
        optimization_opportunities: topDiscrepancies.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        debug_info: {
          error_details: error.toString()
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
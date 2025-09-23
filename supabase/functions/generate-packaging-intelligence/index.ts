import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
      .eq('type', 'Box')
      .order('cost', { ascending: true })
      .limit(50);

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

    // Analyze ALL matched shipments
    let allAnalysisResults = [];
    let totalUtilization = 0;
    let utilizationCount = 0;

    for (const shipment of matchedShipments) {
      if (shipment.order_items && shipment.order_items.length > 0) {
        // Calculate volume from order items
        let totalItemsVolume = 0;
        for (const item of shipment.order_items) {
          if (item.dimensions) {
            const itemVol = (item.dimensions.length || 6) * 
                           (item.dimensions.width || 4) * 
                           (item.dimensions.height || 2);
            totalItemsVolume += itemVol * (item.quantity || 1);
          }
        }

        // Parse package dimensions
        let dims;
        try {
          if (typeof shipment.package_dimensions === 'string') {
            dims = JSON.parse(shipment.package_dimensions);
          } else {
            dims = shipment.package_dimensions;
          }
        } catch (e) {
          dims = null;
        }
        
        let boxVolume = 0;
        if (dims && typeof dims === 'object' && dims.length && dims.width && dims.height) {
          boxVolume = parseFloat(dims.length) * parseFloat(dims.width) * parseFloat(dims.height);
        }

        const utilization = totalItemsVolume > 0 && boxVolume > 0 
          ? (totalItemsVolume / boxVolume) * 100 
          : 0;

        if (utilization > 0) {
          totalUtilization += utilization;
          utilizationCount++;
        }

        // Find optimal box from all available boxes
        let optimalBox = null;
        let bestUtilization = 0;
        
        for (const box of allAvailableBoxes) {
          const candidateVolume = box.length * box.width * box.height;
          const candidateUtilization = totalItemsVolume > 0 && candidateVolume > 0 
            ? (totalItemsVolume / candidateVolume) * 100 
            : 0;
          
          // Look for boxes with 70-90% utilization (ideal range)
          if (candidateUtilization >= 70 && candidateUtilization <= 90 && 
              candidateUtilization > bestUtilization && 
              candidateVolume >= totalItemsVolume) {
            bestUtilization = candidateUtilization;
            optimalBox = box;
          }
        }
        
        // If no box in ideal range, find the smallest box that fits
        if (!optimalBox) {
          for (const box of allAvailableBoxes) {
            const candidateVolume = box.length * box.width * box.height;
            if (candidateVolume >= totalItemsVolume) {
              const candidateUtilization = totalItemsVolume > 0 && candidateVolume > 0 
                ? (totalItemsVolume / candidateVolume) * 100 
                : 0;
              if (candidateUtilization > bestUtilization) {
                bestUtilization = candidateUtilization;
                optimalBox = box;
              }
            }
          }
        }

        if (utilization > 0 || optimalBox) {
          allAnalysisResults.push({
            shipment_id: shipment.shipment_id,
            order_id: shipment.order_id,
            actual_box_sku: shipment.actual_package_sku,
            utilization: utilization,
            items_analyzed: shipment.order_items.length,
            optimal_box: optimalBox,
            optimal_utilization: bestUtilization,
            items_volume: totalItemsVolume,
            box_volume: boxVolume
          });
        }
      }
    }

    const averageUtilization = utilizationCount > 0 ? totalUtilization / utilizationCount : 0;
    console.log(`📊 Analyzed ${allAnalysisResults.length} shipments with average utilization: ${averageUtilization.toFixed(1)}%`);

    // Calculate most used boxes from all shipments
    const boxUsage = {};
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

    // Get top discrepancies (biggest optimization opportunities)
    const topDiscrepancies = allAnalysisResults
      .filter(result => result.optimal_box && result.optimal_utilization > result.utilization)
      .sort((a, b) => (b.optimal_utilization - b.utilization) - (a.optimal_utilization - a.utilization))
      .slice(0, 5)
      .map(result => ({
        shipment_id: result.shipment_id,
        order_id: result.order_id,
        actual_box: result.actual_box_sku,
        optimal_box: `${result.optimal_box.name} ${result.optimal_box.source === 'uline' ? '(Uline: ' + result.optimal_box.vendor_sku + ')' : '(Company)'}`,
        actual_utilization: result.utilization.toFixed(1),
        optimal_utilization: result.optimal_utilization.toFixed(1),
        utilization_improvement: (result.optimal_utilization - result.utilization).toFixed(1),
        potential_savings: parseFloat(((result.optimal_utilization - result.utilization) * 0.05).toFixed(2)),
        confidence: result.optimal_box.source === 'uline' ? 75 : 85
      }));

    // Get inventory suggestions from top optimal boxes
    const optimalBoxCounts = {};
    allAnalysisResults.forEach(result => {
      if (result.optimal_box) {
        const key = result.optimal_box.source === 'uline' ? result.optimal_box.vendor_sku : result.optimal_box.name;
        if (!optimalBoxCounts[key]) {
          optimalBoxCounts[key] = {
            box: result.optimal_box,
            count: 0,
            shipments: []
          };
        }
        optimalBoxCounts[key].count++;
        optimalBoxCounts[key].shipments.push(result.shipment_id);
      }
    });

    const inventorySuggestions = Object.values(optimalBoxCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => ({
        box_id: item.box.source === 'uline' ? item.box.vendor_sku : item.box.id,
        box_name: `${item.box.name} ${item.box.source === 'uline' ? '(Uline)' : '(Company)'}`,
        current_stock: item.box.in_stock || 0,
        projected_need: Math.ceil(item.count * 2),
        days_of_supply: item.box.in_stock ? Math.floor(item.box.in_stock / (item.count / 30)) : 0,
        suggestion: `${item.count} shipments could benefit from this box. ${item.box.source === 'uline' ? 'Consider adding to inventory.' : 'Ensure adequate stock.'}`,
        urgency: (item.box.in_stock || 0) < item.count ? "high" : (item.box.in_stock || 0) < item.count * 2 ? "medium" : "low",
        cost_per_unit: item.box.cost || 0,
        shipments_needing_this_box: item.shipments.slice(0, 5),
        actual_utilization_improvement: item.count
      }));

    // Generate and save the report
    const totalPotentialSavings = topDiscrepancies.reduce((sum, disc) => sum + disc.potential_savings, 0);
    
    const report = {
      company_id,
      generated_at: new Date().toISOString(),
      analysis_period: 'Last 60 days',
      total_orders_analyzed: matchedShipments.length,
      potential_savings: parseFloat(totalPotentialSavings.toFixed(2)),
      top_5_most_used_boxes: mostUsedBoxes,
      top_5_box_discrepancies: topDiscrepancies,
      inventory_suggestions: inventorySuggestions,
      projected_packaging_need: mostUsedBoxes.reduce((acc, box) => {
        acc[box.box_sku] = Math.ceil(box.usage_count * 2);
        return acc;
      }, {}),
      report_data: {
        shipments_with_packaging_data: matchedShipments.length,
        average_actual_utilization: averageUtilization.toFixed(1),
        total_discrepancies_found: topDiscrepancies.length,
        total_potential_savings: totalPotentialSavings.toFixed(2),
        high_efficiency_shipments: allAnalysisResults.filter(r => r.utilization >= 75).length,
        low_efficiency_shipments: allAnalysisResults.filter(r => r.utilization < 50).length,
        utilization_distribution: {
          excellent: allAnalysisResults.filter(r => r.utilization >= 85).length,
          good: allAnalysisResults.filter(r => r.utilization >= 70 && r.utilization < 85).length,
          fair: allAnalysisResults.filter(r => r.utilization >= 50 && r.utilization < 70).length,
          poor: allAnalysisResults.filter(r => r.utilization < 50).length
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
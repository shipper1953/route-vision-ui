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

    // Get company's available boxes for recommendations
    const { data: availableBoxes, error: boxesError } = await supabase
      .from('boxes')
      .select('id, name, length, width, height, max_weight, cost, in_stock')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .order('cost', { ascending: true });

    console.log(`📦 Found ${availableBoxes?.length || 0} available boxes for optimization`);

    // Analyze the first matched shipment if available
    let analysisResult = null;
    let utilizationCalculation = null;

    if (matchedShipments.length > 0) {
      const testShip = matchedShipments[0];
      console.log('🧪 Analyzing test shipment:', {
        id: testShip.shipment_id,
        sku: testShip.actual_package_sku,
        items_count: testShip.items_count
      });

      if (testShip.order_items && testShip.order_items.length > 0) {
        // Calculate volume from order items
        let totalItemsVolume = 0;
        for (const item of testShip.order_items) {
          if (item.dimensions) {
            const itemVol = (item.dimensions.length || 6) * 
                           (item.dimensions.width || 4) * 
                           (item.dimensions.height || 2);
            totalItemsVolume += itemVol * (item.quantity || 1);
          }
        }

        // Parse package dimensions (they might be stored as JSON string)
        let dims;
        try {
          if (typeof testShip.package_dimensions === 'string') {
            dims = JSON.parse(testShip.package_dimensions);
            console.log('✅ Parsed dimensions from string:', dims);
          } else {
            dims = testShip.package_dimensions;
            console.log('✅ Using object dimensions:', dims);
          }
        } catch (e) {
          console.log('⚠️ Could not parse package dimensions:', testShip.package_dimensions);
          dims = null;
        }
        
        let boxVolume = 0;
        if (dims && typeof dims === 'object' && dims.length && dims.width && dims.height) {
          boxVolume = parseFloat(dims.length) * parseFloat(dims.width) * parseFloat(dims.height);
          console.log('📦 Box volume calculated:', boxVolume, 'from dimensions:', dims);
        } else {
          console.log('❌ Invalid dimensions format:', dims);
        }

        const utilization = totalItemsVolume > 0 && boxVolume > 0 
          ? (totalItemsVolume / boxVolume) * 100 
          : 0;

        console.log('📊 Utilization calculation:', {
          itemsVolume: totalItemsVolume,
          boxVolume: boxVolume,
          utilization: utilization.toFixed(1) + '%'
        });

        // Find optimal box from available boxes
        let optimalBox = null;
        let bestUtilization = 0;
        
        if (availableBoxes && availableBoxes.length > 0) {
          for (const box of availableBoxes) {
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
            for (const box of availableBoxes) {
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
        }

        utilizationCalculation = {
          items_volume: totalItemsVolume,
          box_volume: boxVolume,
          utilization_percent: utilization,
          optimal_box_volume: optimalBox ? (optimalBox.length * optimalBox.width * optimalBox.height) : null,
          optimal_utilization: bestUtilization
        };

        analysisResult = {
          shipment_id: testShip.shipment_id,
          order_id: testShip.order_id,
          actual_box_sku: testShip.actual_package_sku,
          utilization: utilization,
          items_analyzed: testShip.order_items.length,
          optimal_box: optimalBox,
          optimal_utilization: bestUtilization
        };
      }
    }

    // Generate and save the report
    const report = {
      company_id,
      generated_at: new Date().toISOString(),
      analysis_period: 'Last 60 days',
      total_orders_analyzed: matchedShipments.length,
      potential_savings: analysisResult ? parseFloat((analysisResult.utilization * 0.1).toFixed(2)) : 0,
      top_5_most_used_boxes: matchedShipments.length > 0 ? [{
        box_sku: matchedShipments[0].actual_package_sku,
        usage_count: matchedShipments.filter(s => s.actual_package_sku === matchedShipments[0].actual_package_sku).length,
        percentage_of_shipments: ((matchedShipments.filter(s => s.actual_package_sku === matchedShipments[0].actual_package_sku).length / matchedShipments.length) * 100).toFixed(1)
      }] : [],
      top_5_box_discrepancies: analysisResult ? [{
        shipment_id: analysisResult.shipment_id,
        order_id: analysisResult.order_id,
        actual_box: analysisResult.actual_box_sku,
        optimal_box: analysisResult.optimal_box ? analysisResult.optimal_box.name : "No optimal box found",
        actual_utilization: analysisResult.utilization.toFixed(1),
        optimal_utilization: analysisResult.optimal_utilization ? analysisResult.optimal_utilization.toFixed(1) : "N/A",
        utilization_improvement: analysisResult.optimal_utilization ? Math.max(0, analysisResult.optimal_utilization - analysisResult.utilization).toFixed(1) : "0.0",
        potential_savings: analysisResult.optimal_box ? parseFloat((Math.max(0, analysisResult.optimal_utilization - analysisResult.utilization) * 0.05).toFixed(2)) : 0,
        confidence: analysisResult.optimal_box ? 85 : 50
      }] : [],
      inventory_suggestions: analysisResult && analysisResult.optimal_box ? [{
        box_id: analysisResult.optimal_box.id,
        box_name: analysisResult.optimal_box.name,
        current_stock: analysisResult.optimal_box.in_stock,
        projected_need: Math.ceil(matchedShipments.length / 30),
        days_of_supply: Math.floor(analysisResult.optimal_box.in_stock / (matchedShipments.length / 30)),
        suggestion: `Switch to ${analysisResult.optimal_box.name} for better utilization (${analysisResult.optimal_utilization.toFixed(1)}% vs current ${analysisResult.utilization.toFixed(1)}%)`,
        urgency: analysisResult.optimal_box.in_stock < 10 ? "high" : analysisResult.optimal_box.in_stock < 30 ? "medium" : "low",
        cost_per_unit: analysisResult.optimal_box.cost,
        shipments_needing_this_box: [analysisResult.shipment_id],
        actual_utilization_improvement: Math.max(0, analysisResult.optimal_utilization - analysisResult.utilization)
      }] : [],
      projected_packaging_need: matchedShipments.length > 0 ? {
        [matchedShipments[0].actual_package_sku]: Math.ceil(matchedShipments.length / 30)
      } : {},
      report_data: {
        shipments_with_packaging_data: matchedShipments.length,
        average_actual_utilization: analysisResult ? analysisResult.utilization.toFixed(1) : "0.0",
        total_discrepancies_found: analysisResult ? 1 : 0,
        total_potential_savings: analysisResult ? (analysisResult.utilization * 0.1).toFixed(2) : "0.00",
        high_efficiency_shipments: analysisResult && analysisResult.utilization >= 75 ? 1 : 0,
        low_efficiency_shipments: analysisResult && analysisResult.utilization < 50 ? 1 : 0,
        utilization_distribution: {
          excellent: analysisResult && analysisResult.utilization >= 85 ? 1 : 0,
          good: analysisResult && analysisResult.utilization >= 70 && analysisResult.utilization < 85 ? 1 : 0,
          fair: analysisResult && analysisResult.utilization >= 50 && analysisResult.utilization < 70 ? 1 : 0,
          poor: analysisResult && analysisResult.utilization < 50 ? 1 : 0
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
          test_analysis: analysisResult,
          utilization_calc: utilizationCalculation,
          sample_shipment: matchedShipments.length > 0 ? matchedShipments[0] : null
        },
        shipments_analyzed: matchedShipments.length,
        total_savings: analysisResult ? parseFloat((analysisResult.utilization * 0.1).toFixed(2)) : 0,
        average_utilization: analysisResult ? analysisResult.utilization : 0,
        optimization_opportunities: analysisResult ? 1 : 0
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
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

    if (!company_id) {
      throw new Error('Company ID is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get shipments from the last 60 days to be safe
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Get all shipments with package data first
    const { data: allShipments, error: shipmentsError } = await supabase
      .from('shipments')
      .select('id, created_at, actual_package_sku, package_dimensions, cost, total_weight')
      .not('actual_package_sku', 'is', null)
      .not('package_dimensions', 'is', null)
      .gte('created_at', sixtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(200);

    if (shipmentsError) {
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

      if (ordersError) {
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
            created_at: shipment.created_at
          });
        }
      }
    }

    // If we have matched shipments, analyze the first one as a test
    let analysisResult = null;
    let utilizationCalculation = null;

    if (matchedShipments.length > 0) {
      const testShip = matchedShipments[0];
      const order = await supabase
        .from('orders')
        .select('items')
        .eq('shipment_id', testShip.shipment_id)
        .single();

      if (order.data?.items) {
        // Calculate volume from order items
        let totalItemsVolume = 0;
        for (const item of order.data.items) {
          if (item.dimensions) {
            const itemVol = (item.dimensions.length || 6) * 
                           (item.dimensions.width || 4) * 
                           (item.dimensions.height || 2);
            totalItemsVolume += itemVol * (item.quantity || 1);
          }
        }

        // Calculate box volume
        const dims = testShip.package_dimensions;
        let boxVolume = 0;
        if (typeof dims === 'object' && dims.length && dims.width && dims.height) {
          boxVolume = dims.length * dims.width * dims.height;
        }

        const utilization = totalItemsVolume > 0 && boxVolume > 0 
          ? (totalItemsVolume / boxVolume) * 100 
          : 0;

        utilizationCalculation = {
          items_volume: totalItemsVolume,
          box_volume: boxVolume,
          utilization_percent: utilization
        };

        analysisResult = {
          shipment_id: testShip.shipment_id,
          order_id: testShip.order_id,
          actual_box_sku: testShip.actual_package_sku,
          utilization: utilization,
          items_analyzed: order.data.items.length
        };
      }
    }

    // Generate and save a test report
    const report = {
      company_id,
      generated_at: new Date().toISOString(),
      analysis_period: 'Last 60 days',
      total_orders_analyzed: matchedShipments.length,
      potential_savings: analysisResult ? 10.50 : 0, // Test value
      top_5_most_used_boxes: matchedShipments.length > 0 ? [{
        box_sku: matchedShipments[0].actual_package_sku,
        usage_count: 1,
        percentage_of_shipments: 100
      }] : [],
      top_5_box_discrepancies: analysisResult ? [{
        shipment_id: analysisResult.shipment_id,
        order_id: analysisResult.order_id,
        actual_box: analysisResult.actual_box_sku,
        optimal_box: "Test Optimal Box",
        actual_utilization: analysisResult.utilization.toFixed(1),
        optimal_utilization: "85.0",
        utilization_improvement: "10.0",
        potential_savings: 5.25,
        confidence: 90
      }] : [],
      inventory_suggestions: analysisResult ? [{
        box_id: "TEST-BOX-001",
        box_name: "Test Recommended Box",
        current_stock: 0,
        projected_need: 1,
        days_of_supply: 0,
        suggestion: "Test suggestion",
        urgency: "medium",
        cost_per_unit: 2.50,
        shipments_needing_this_box: [analysisResult.shipment_id],
        actual_utilization_improvement: 10.0
      }] : [],
      projected_packaging_need: matchedShipments.length > 0 ? {
        [matchedShipments[0].actual_package_sku]: 2
      } : {},
      report_data: {
        shipments_with_packaging_data: matchedShipments.length,
        average_actual_utilization: analysisResult ? analysisResult.utilization.toFixed(1) : "0.0",
        total_discrepancies_found: analysisResult ? 1 : 0,
        total_potential_savings: analysisResult ? "10.50" : "0.00",
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

    // Save the test report
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
      throw new Error(`Failed to save report: ${reportError.message}`);
    }

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
        report_id: report,
        shipments_analyzed: matchedShipments.length,
        total_savings: analysisResult ? 10.50 : 0,
        average_utilization: analysisResult ? analysisResult.utilization : 0,
        optimization_opportunities: analysisResult ? 1 : 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
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
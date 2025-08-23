import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderAnalysis {
  order_id: string;
  recommended_box_id?: string;
  actual_box_id?: string;
  shipping_cost?: number;
  potential_savings?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id } = await req.json();
    
    if (!company_id) {
      throw new Error("Company ID is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Generating packaging intelligence report for company: ${company_id}`);

    // 1. Analyze Recent Orders (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
          service
        )
      `)
      .eq('company_id', company_id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(1000);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      throw new Error(`Failed to fetch orders: ${ordersError.message}`);
    }

    console.log(`Found ${recentOrders?.length || 0} recent orders to analyze`);

    // 2. Run Cartonization Analysis on Each Order
    const orderAnalyses: OrderAnalysis[] = [];
    let totalPotentialSavings = 0;
    const boxUsageCount: Record<string, number> = {};
    const boxDiscrepancyCount: Record<string, number> = {};

    // Get available packaging from master list
    const { data: availablePackaging } = await supabase
      .from('packaging_master_list')
      .select('*')
      .eq('is_active', true)
      .order('cost', { ascending: true });

    console.log(`Available packaging options: ${availablePackaging?.length || 0}`);

    for (const order of recentOrders || []) {
      try {
        // Simple cartonization logic (can be enhanced)
        const items = Array.isArray(order.items) ? order.items : [];
        let totalVolume = 0;
        let totalWeight = 0;

        // Calculate approximate volume and weight from items
        for (const item of items) {
          const quantity = item.quantity || 1;
          
          // Get dimensions from nested dimensions object if available
          const dimensions = item.dimensions || {};
          const length = dimensions.length || item.length || 6; // default dimensions if not provided
          const width = dimensions.width || item.width || 4;
          const height = dimensions.height || item.height || 2;
          const weight = dimensions.weight || item.weight || 8; // default weight in oz

          totalVolume += quantity * (length * width * height);
          totalWeight += quantity * weight;
        }

        // Find optimal packaging
        let optimalPackaging = null;
        let optimalCost = Infinity;

        for (const pkg of availablePackaging || []) {
          const packageVolume = pkg.length_in * pkg.width_in * pkg.height_in;
          if (packageVolume >= totalVolume && pkg.cost < optimalCost) {
            optimalPackaging = pkg;
            optimalCost = pkg.cost;
          }
        }

        if (optimalPackaging) {
          // Store recommendation with proper conflict handling
          const { error: upsertError } = await supabase
            .from('order_packaging_recommendations')
            .upsert({
              order_id: order.id,
              recommended_master_list_id: optimalPackaging.id,
              calculated_volume: totalVolume,
              calculated_weight: totalWeight,
              confidence_score: 85, // Simple confidence score
              potential_savings: 0 // Will be calculated if we have shipping data
            }, {
              onConflict: 'order_id'
            });
          
          if (upsertError) {
            console.warn(`Failed to upsert recommendation for order ${order.id}:`, upsertError);
          }

          boxUsageCount[optimalPackaging.vendor_sku] = (boxUsageCount[optimalPackaging.vendor_sku] || 0) + 1;

          // If order has shipment data, calculate potential savings
          if (order.shipments?.length > 0) {
            const actualCost = order.shipments[0].cost || 0;
            // Simplified savings calculation - in reality this would be more complex
            const estimatedOptimalCost = actualCost * 0.9; // Assume 10% potential savings
            const savings = Math.max(0, actualCost - estimatedOptimalCost);
            totalPotentialSavings += savings;

            if (savings > 0) {
              boxDiscrepancyCount[optimalPackaging.vendor_sku] = (boxDiscrepancyCount[optimalPackaging.vendor_sku] || 0) + 1;
            }
          }
        }

        orderAnalyses.push({
          order_id: order.order_id,
          recommended_box_id: optimalPackaging?.vendor_sku,
          potential_savings: 0 // Individual order savings would be calculated here
        });

      } catch (error) {
        console.error(`Error analyzing order ${order.id}:`, error);
      }
    }

    // 3. Get Current Inventory Status
    const { data: currentInventory } = await supabase
      .from('packaging_inventory')
      .select(`
        *,
        packaging_master_list (
          vendor_sku,
          name,
          cost
        )
      `)
      .eq('company_id', company_id);

    // 4. Generate Inventory Suggestions
    const inventorySuggestions = (currentInventory || []).map(invItem => {
      const sku = invItem.packaging_master_list?.vendor_sku || 'Unknown';
      const projectedUsage = boxUsageCount[sku] || 0;
      const historicalUsageRate = (boxUsageCount[sku] || 0) / 30; // Daily average
      const daysOfSupply = historicalUsageRate > 0 ? invItem.quantity_on_hand / historicalUsageRate : 999;

      let suggestion = 'OK';
      if (daysOfSupply < 14) suggestion = 'ORDER SOON';
      else if (daysOfSupply > 60) suggestion = 'TOO MUCH STOCK';

      return {
        box_id: sku,
        current_stock: invItem.quantity_on_hand,
        projected_need: projectedUsage,
        days_of_supply: daysOfSupply,
        suggestion
      };
    });

    // 5. Generate Report
    const report = {
      company_id,
      generated_at: new Date().toISOString(),
      analysis_period: 'Last 30 days',
      total_orders_analyzed: recentOrders?.length || 0,
      potential_savings: totalPotentialSavings,
      top_5_most_used_boxes: Object.entries(boxUsageCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      top_5_box_discrepancies: Object.entries(boxDiscrepancyCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      inventory_suggestions: inventorySuggestions,
      projected_packaging_need: boxUsageCount
    };

    // 6. Save Report to Database - first delete existing reports for today, then insert new one
    const today = new Date().toISOString().split('T')[0];
    
    // Delete existing reports for today
    const { error: deleteError } = await supabase
      .from('packaging_intelligence_reports')
      .delete()
      .eq('company_id', company_id)
      .gte('generated_at', `${today}T00:00:00Z`)
      .lt('generated_at', `${today}T23:59:59Z`);

    if (deleteError) {
      console.warn('Could not delete existing reports:', deleteError);
    }

    // Insert the new report
    const { error: reportError } = await supabase
      .from('packaging_intelligence_reports')
      .insert([report]);

    if (reportError) {
      console.error('Error saving report:', reportError);
      throw new Error(`Failed to save report: ${reportError.message}`);
    }

    // 7. Generate Alerts for Critical Issues
    const alerts = [];

    // Low stock alerts
    for (const suggestion of inventorySuggestions) {
      if (suggestion.suggestion === 'ORDER SOON') {
        alerts.push({
          company_id,
          alert_type: 'low_stock',
          message: `🚨 LOW STOCK: ${suggestion.box_id} has only ${suggestion.current_stock} units left (${suggestion.days_of_supply.toFixed(1)} days supply)`,
          severity: 'warning',
          metadata: { box_id: suggestion.box_id, stock: suggestion.current_stock }
        });
      }
    }

    // Cost opportunity alerts
    if (totalPotentialSavings > 50) {
      alerts.push({
        company_id,
        alert_type: 'cost_opportunity',
        message: `💰 COST OPPORTUNITY: You could save $${totalPotentialSavings.toFixed(2)} by optimizing packaging choices`,
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
        total_savings: totalPotentialSavings
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
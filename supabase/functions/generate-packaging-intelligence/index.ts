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
          service,
          package_dimensions,
          actual_package_sku,
          actual_package_master_id
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

    // 2. Run Enhanced Cartonization Analysis on Each Order
    const orderAnalyses: OrderAnalysis[] = [];
    let totalPotentialSavings = 0;
    const boxUsageCount: Record<string, number> = {};
    const actualBoxUsageCount: Record<string, number> = {};
    const boxDiscrepancyCount: Record<string, number> = {};
    const detailedDiscrepancies: any[] = [];
    const recommendationsToUpsert: any[] = [];
    const suboptimalAlerts: any[] = [];

    // Get available packaging from company's boxes
    const { data: availablePackaging, error: packagingError } = await supabase
      .from('boxes')
      .select('id, name, sku, length, width, height, cost, max_weight')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .order('cost', { ascending: true });

    if (packagingError) {
      console.error('Error fetching company boxes:', packagingError);
      throw new Error(`Failed to fetch company boxes: ${packagingError.message}`);
    }

    console.log(`Available company boxes: ${availablePackaging?.length || 0}`);

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
          const packageVolume = Number(pkg.length) * Number(pkg.width) * Number(pkg.height);
          const maxWeight = Number(pkg.max_weight);
          if (packageVolume >= totalVolume && totalWeight <= maxWeight && pkg.cost < optimalCost) {
            optimalPackaging = pkg;
            optimalCost = pkg.cost;
          }
        }

        if (optimalPackaging) {
          const boxSku = optimalPackaging.sku || optimalPackaging.name;
          
          boxUsageCount[boxSku] = (boxUsageCount[boxSku] || 0) + 1;

          // Track actual packaging usage if available
          if (order.shipments?.length > 0 && order.shipments[0].actual_package_sku) {
            const actualSku = order.shipments[0].actual_package_sku;
            actualBoxUsageCount[actualSku] = (actualBoxUsageCount[actualSku] || 0) + 1;

            // Compare actual vs optimal packaging for cost analysis
            if (actualSku !== boxSku) {
              const actualPackaging = availablePackaging?.find(pkg => (pkg.sku || pkg.name) === actualSku);
              if (actualPackaging) {
                const costDifference = actualPackaging.cost - optimalPackaging.cost;
                if (costDifference > 0) {
                  totalPotentialSavings += costDifference;
                  boxDiscrepancyCount[boxSku] = (boxDiscrepancyCount[boxSku] || 0) + 1;
                  
                  // Add to detailed discrepancies
                  const actualVolume = Number(actualPackaging.length) * Number(actualPackaging.width) * Number(actualPackaging.height);
                  const optimalVolume = Number(optimalPackaging.length) * Number(optimalPackaging.width) * Number(optimalPackaging.height);
                  const wastePercentage = Math.round(((actualVolume - optimalVolume) / optimalVolume) * 100);
                  
                  detailedDiscrepancies.push({
                    order_id: order.order_id,
                    actual_box: actualSku,
                    optimal_box: boxSku,
                    actual_volume: actualVolume,
                    optimal_volume: optimalVolume,
                    waste_percentage: wastePercentage,
                    cost_difference: costDifference,
                    potential_savings: costDifference
                  });
                }
              }
            }
          }

          // If order has shipment data, calculate potential savings and detect suboptimal fit
          if (order.shipments?.length > 0) {
            const actualCost = order.shipments[0].cost || 0;
            const estimatedOptimalCost = actualCost * 0.9;
            const savings = Math.max(0, actualCost - estimatedOptimalCost);
            totalPotentialSavings += savings;

            if (savings > 0) {
              boxDiscrepancyCount[boxSku] = (boxDiscrepancyCount[boxSku] || 0) + 1;
            }

            // Compare package volumes to flag suboptimal usage (robustly handle array/object JSON)
            const pkgDims = (order.shipments[0] as any).package_dimensions as any;
            let parsedDims: any = null;
            try {
              parsedDims = pkgDims
                ? (typeof pkgDims === 'string' ? JSON.parse(pkgDims) : pkgDims)
                : null;
            } catch (_) {
              parsedDims = null;
            }

            const dims = Array.isArray(parsedDims) ? parsedDims[0] : parsedDims;
            if (dims && typeof dims === 'object' && dims.length && dims.width && dims.height) {
              const actualVolume = Number(dims.length) * Number(dims.width) * Number(dims.height);
              const optVolume = Number(optimalPackaging.length) * Number(optimalPackaging.width) * Number(optimalPackaging.height);
              if (actualVolume > optVolume * 1.4) { // 40% larger than optimal
                const wastePercentage = Math.round(((actualVolume - optVolume) / optVolume) * 100);
                // Record detailed discrepancy (volume-based)
                detailedDiscrepancies.push({
                  order_id: order.order_id,
                  actual_box: `${dims.length}x${dims.width}x${dims.height}`,
                  optimal_box: boxSku,
                  actual_volume: actualVolume,
                  optimal_volume: optVolume,
                  waste_percentage: wastePercentage,
                  cost_difference: 0,
                  potential_savings: 0
                });

                // Create alert for analytics
                suboptimalAlerts.push({
                  company_id,
                  alert_type: 'suboptimal_package',
                  message: `📦 Suboptimal packaging: Order ${order.order_id} used ${dims.length}x${dims.width}x${dims.height}, recommended ${boxSku} (${optimalPackaging.length}x${optimalPackaging.width}x${optimalPackaging.height}) would reduce volume by ${wastePercentage}%`,
                  severity: 'info',
                  metadata: {
                    order_id: order.order_id,
                    used_dimensions: dims,
                    recommended: {
                      sku: boxSku,
                      name: optimalPackaging.name,
                      dims: { length: optimalPackaging.length, width: optimalPackaging.width, height: optimalPackaging.height }
                    }
                  }
                });
              }
            }
          }
        }

        orderAnalyses.push({
          order_id: order.order_id,
          recommended_box_id: optimalPackaging ? (optimalPackaging.sku || optimalPackaging.name) : null,
          potential_savings: 0
        });

      } catch (error) {
        console.error(`Error analyzing order ${order.id}:`, error);
      }
    }

    // 3. Get Current Box Inventory Status (use company's boxes instead of packaging_inventory)
    const { data: currentInventory, error: inventoryError } = await supabase
      .from('boxes')
      .select('id, name, sku, cost, in_stock, length, width, height')
      .eq('company_id', company_id)
      .eq('is_active', true);

    if (inventoryError) {
      console.error('Error fetching box inventory:', inventoryError);
      throw new Error(`Failed to fetch box inventory: ${inventoryError.message}`);
    }

    // 4. Generate Enhanced Inventory Suggestions based on company's actual boxes
    const inventorySuggestions = (currentInventory || []).map(box => {
      const boxSku = box.sku || box.name;
      const recommendedUsage = boxUsageCount[boxSku] || 0;
      const actualUsage = actualBoxUsageCount[boxSku] || 0;
      const totalUsage = Math.max(recommendedUsage, actualUsage);
      const historicalUsageRate = totalUsage / 30; // Daily average
      const currentStock = box.in_stock || 0;
      const daysOfSupply = historicalUsageRate > 0 ? currentStock / historicalUsageRate : 999;
      const reorderThreshold = 10; // Default threshold
      
      let suggestion = 'Adequate stock';
      let urgency = 'low';
      
      if (currentStock <= reorderThreshold) {
        suggestion = `REORDER NOW - Below threshold (${reorderThreshold} units)`;
        urgency = 'high';
      } else if (daysOfSupply <= 14 && totalUsage > 0) {
        suggestion = `Consider reordering - Only ${Math.round(daysOfSupply)} days of supply remaining`;
        urgency = 'medium';
      } else if (totalUsage === 0 && currentStock > 50) {
        suggestion = 'Excess inventory - No usage detected in 30 days';
        urgency = 'low';
      } else if (daysOfSupply > 90) {
        suggestion = 'Overstocked - Consider reducing future orders';
        urgency = 'low';
      }

      return {
        box_id: boxSku,
        current_stock: currentStock,
        projected_need: totalUsage,
        recommended_usage: recommendedUsage,
        actual_usage: actualUsage,
        days_of_supply: Math.round(daysOfSupply),
        reorder_threshold: reorderThreshold,
        suggested_order_quantity: 100,
        cost_per_unit: box.cost || 0,
        suggestion,
        urgency
      };
    }).filter(item => item.urgency !== 'low' || item.projected_need > 0)
      .sort((a, b) => {
        const urgencyOrder = { high: 3, medium: 2, low: 1 };
        const urgencyDiff = urgencyOrder[b.urgency as keyof typeof urgencyOrder] - urgencyOrder[a.urgency as keyof typeof urgencyOrder];
        if (urgencyDiff !== 0) return urgencyDiff;
        return b.projected_need - a.projected_need;
      });

    // 5. Generate Enhanced Report
    // Combine actual and recommended box usage for comprehensive view
    const combinedBoxUsage: Record<string, { recommended: number, actual: number, total: number }> = {};
    
    // Add recommended usage
    Object.entries(boxUsageCount).forEach(([sku, count]) => {
      if (!combinedBoxUsage[sku]) combinedBoxUsage[sku] = { recommended: 0, actual: 0, total: 0 };
      combinedBoxUsage[sku].recommended = count;
      combinedBoxUsage[sku].total += count;
    });
    
    // Add actual usage
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
        .sort((a, b) => (b.potential_savings || b.waste_percentage || 0) - (a.potential_savings || a.waste_percentage || 0))
        .slice(0, 5),
      inventory_suggestions: inventorySuggestions.slice(0, 10),
      projected_packaging_need: Object.entries(combinedBoxUsage).reduce((acc, [sku, usage]) => {
        acc[sku] = Math.ceil(usage.total * 1.1); // 10% buffer for next month
        return acc;
      }, {} as Record<string, number>),
      report_data: {
        orders_with_actual_packaging: recentOrders?.filter(o => o.shipments?.[0]?.actual_package_sku).length || 0,
        total_discrepancies_found: detailedDiscrepancies.length,
        average_cost_per_discrepancy: detailedDiscrepancies.length > 0 
          ? (detailedDiscrepancies.reduce((sum, d) => sum + (d.potential_savings || 0), 0) / detailedDiscrepancies.length).toFixed(2)
          : 0
      }
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
    const alerts = [...suboptimalAlerts];

    // Low stock alerts
    for (const suggestion of inventorySuggestions) {
      if (suggestion.urgency === 'high') {
        alerts.push({
          company_id,
          alert_type: 'low_stock',
          message: `🚨 LOW STOCK: ${suggestion.box_id} has only ${suggestion.current_stock} units left (${suggestion.days_of_supply} days supply)`,
          severity: 'warning',
          metadata: { box_id: suggestion.box_id, stock: suggestion.current_stock, days_supply: suggestion.days_of_supply }
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
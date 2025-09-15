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
      .in('status', ['shipped','delivered'])
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

    // Get available packaging options from Uline master list (uploaded catalog)
    const { data: availablePackaging, error: packagingError } = await supabase
      .from('packaging_master_list')
      .select('id, vendor_sku, name, length_in, width_in, height_in, weight_oz, cost, is_active')
      .eq('is_active', true)
      .order('cost', { ascending: true });

    if (packagingError) {
      console.error('Error fetching packaging options:', packagingError);
      throw new Error(`Failed to fetch packaging options: ${packagingError.message}`);
    }

    console.log(`Available packaging options: ${availablePackaging?.length || 0}`);

    // Step 3: Analyze packaging efficiency using proper cartonization algorithm
    console.log('Analyzing packaging efficiency with advanced cartonization...');
    const discrepancies = [];
    let totalPotentialSavings = 0;
    
    // Import the CartonizationEngine class (inline for edge function)
    class EnhancedCartonizationEngine {
      constructor(private boxes: any[]) {}
      
      findOptimalBox(items: any[]): any {
        const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
        const totalVolume = items.reduce((sum, item) => 
          sum + (item.length * item.width * item.height * item.quantity), 0);
        
        // Filter boxes that can handle the weight
        const suitableBoxes = this.boxes.filter(box => {
          const maxWeight = box.weight_oz ? (box.weight_oz / 16) * 10 : 50;
          return totalWeight <= maxWeight;
        });
        
        if (!suitableBoxes.length) return null;
        
        // Sort by volume (smallest first) for space optimization
        const sortedBoxes = suitableBoxes.sort((a, b) => {
          const volumeA = a.length_in * a.width_in * a.height_in;
          const volumeB = b.length_in * b.width_in * b.height_in;
          return volumeA - volumeB;
        });
        
        // Find the smallest box that can actually fit all items
        for (const box of sortedBoxes) {
          if (this.checkItemsFit(items, box)) {
            return box;
          }
        }
        
        return null;
      }
      
      private checkItemsFit(items: any[], box: any): boolean {
        // Enhanced 3D bin packing check
        const totalVolume = items.reduce((sum, item) => 
          sum + (item.length * item.width * item.height * item.quantity), 0);
        const boxVolume = box.length_in * box.width_in * box.height_in;
        
        // Volume check with 85% efficiency
        if (totalVolume > boxVolume * 0.85) return false;
        
        // Check if largest item fits in any orientation
        const largestItem = items.reduce((max, item) => {
          const volume = item.length * item.width * item.height;
          return volume > (max.length * max.width * max.height) ? item : max;
        });
        
        const itemDims = [largestItem.length, largestItem.width, largestItem.height].sort((a, b) => b - a);
        const boxDims = [box.length_in, box.width_in, box.height_in].sort((a, b) => b - a);
        
        return itemDims[0] <= boxDims[0] && itemDims[1] <= boxDims[1] && itemDims[2] <= boxDims[2];
      }
      
      calculateShippingCostImpact(currentBox: any, optimalBox: any, actualWeight: number) {
        const dimWeightFactor = 139;
        const costPerPound = 0.15;
        
        const currentDimWeight = (currentBox.length_in * currentBox.width_in * currentBox.height_in) / dimWeightFactor;
        const optimalDimWeight = (optimalBox.length_in * optimalBox.width_in * optimalBox.height_in) / dimWeightFactor;
        
        const currentBillableWeight = Math.max(actualWeight, currentDimWeight);
        const optimalBillableWeight = Math.max(actualWeight, optimalDimWeight);
        
        const currentShippingCost = currentBillableWeight * costPerPound;
        const optimalShippingCost = optimalBillableWeight * costPerPound;
        
        return {
          currentShippingCost,
          optimalShippingCost,
          savings: currentShippingCost - optimalShippingCost
        };
      }
    }
    
    const cartonizationEngine = new EnhancedCartonizationEngine(availablePackaging || []);
    
    for (const order of recentOrders || []) {
      try {
        // Convert order items to cartonization format
        const items = Array.isArray(order.items) ? order.items : [];
        const cartonItems = items.map((item: any) => {
          const dimensions = item.dimensions || {};
          return {
            name: item.name || 'Unknown Item',
            length: dimensions.length || item.length || 6,
            width: dimensions.width || item.width || 4,
            height: dimensions.height || item.height || 2,
            weight: (dimensions.weight || item.weight || 8) / 16, // Convert oz to lbs
            quantity: item.quantity || 1,
            category: item.category || 'general',
            fragile: false
          };
        });
        
        if (!cartonItems.length) continue;
        
        // Calculate order weight
        const orderWeight = cartonItems.reduce((sum, item) => 
          sum + (item.weight * item.quantity), 0
        );
        
        // Find optimal packaging using enhanced cartonization
        const optimalPackaging = cartonizationEngine.findOptimalBox(cartonItems);
        if (!optimalPackaging) continue;
        
        const optimalSku = optimalPackaging.vendor_sku;
        boxUsageCount[optimalSku] = (boxUsageCount[optimalSku] || 0) + 1;
        
        // Analyze actual packaging usage if shipment data exists
        if (order.shipments?.length > 0) {
          const shipment = order.shipments[0];
          const actualSku = shipment.actual_package_sku;
          const actualMasterId = shipment.actual_package_master_id;
          
          let actualPackaging = null;
          let resolvedActualSku = actualSku;
          
          // Resolve actual packaging from SKU or ID
          if (actualSku) {
            actualPackaging = (availablePackaging || []).find(pkg => pkg.vendor_sku === actualSku);
          } else if (actualMasterId) {
            actualPackaging = (availablePackaging || []).find(pkg => pkg.id === actualMasterId);
            if (actualPackaging) {
              resolvedActualSku = actualPackaging.vendor_sku;
            }
          }
          
          if (resolvedActualSku) {
            actualBoxUsageCount[resolvedActualSku] = (actualBoxUsageCount[resolvedActualSku] || 0) + 1;
          }
          
          // Direct comparison if we have actual packaging data
          if (actualPackaging && resolvedActualSku !== optimalSku) {
            const materialSavings = Math.max(0, actualPackaging.cost - optimalPackaging.cost);
            const shippingImpact = cartonizationEngine.calculateShippingCostImpact(
              actualPackaging, optimalPackaging, orderWeight
            );
            
            const totalSavings = materialSavings + shippingImpact.savings;
            
            if (totalSavings > 0.10) { // Only flag if savings are meaningful (>$0.10)
              totalPotentialSavings += totalSavings;
              boxDiscrepancyCount[optimalSku] = (boxDiscrepancyCount[optimalSku] || 0) + 1;
              
              const actualVolume = actualPackaging.length_in * actualPackaging.width_in * actualPackaging.height_in;
              const optimalVolume = optimalPackaging.length_in * optimalPackaging.width_in * optimalPackaging.height_in;
              const volumeReduction = ((actualVolume - optimalVolume) / actualVolume * 100);
              
              detailedDiscrepancies.push({
                order_id: order.order_id,
                actual_box: `${actualPackaging.name} (${resolvedActualSku})`,
                optimal_box: `${optimalPackaging.name} (${optimalSku})`,
                actual_volume: actualVolume,
                optimal_volume: optimalVolume,
                volume_reduction_percent: volumeReduction,
                material_savings: materialSavings,
                shipping_savings: shippingImpact.savings,
                total_savings: totalSavings,
                actual_dimensions: `${actualPackaging.length_in}"×${actualPackaging.width_in}"×${actualPackaging.height_in}"`,
                optimal_dimensions: `${optimalPackaging.length_in}"×${optimalPackaging.width_in}"×${optimalPackaging.height_in}"`,
                confidence: shippingImpact.savings > 0.50 ? 95 : 85,
                potential_savings: totalSavings
              });
            }
          }
          
          // Volume-based analysis using package dimensions if no direct match
          const packageDims = shipment.package_dimensions;
          let parsedDims = null;
          
          try {
            parsedDims = packageDims ? (typeof packageDims === 'string' ? JSON.parse(packageDims) : packageDims) : null;
          } catch (_) {
            parsedDims = null;
          }
          
          const dims = Array.isArray(parsedDims) ? parsedDims[0] : parsedDims;
          if (!actualPackaging && dims && typeof dims === 'object' && dims.length && dims.width && dims.height) {
            const actualVolume = dims.length * dims.width * dims.height;
            const optimalVolume = optimalPackaging.length_in * optimalPackaging.width_in * optimalPackaging.height_in;
            
            // Flag significant volume waste (20%+ larger than optimal)
            if (actualVolume > optimalVolume * 1.20) {
              const estimatedActualBox = {
                name: `${dims.length}"×${dims.width}"×${dims.height}" Box`,
                cost: optimalPackaging.cost * 1.3, // Estimate 30% higher cost
                length_in: dims.length,
                width_in: dims.width,
                height_in: dims.height,
                vendor_sku: 'ESTIMATED-OVERSIZED',
                weight_oz: optimalPackaging.weight_oz
              };
              
              const shippingImpact = cartonizationEngine.calculateShippingCostImpact(
                estimatedActualBox, optimalPackaging, orderWeight
              );
              
              const estimatedMaterialSavings = estimatedActualBox.cost - optimalPackaging.cost;
              const totalSavings = estimatedMaterialSavings + shippingImpact.savings;
              
              if (totalSavings > 0.25) { // Higher threshold for estimated savings
                totalPotentialSavings += totalSavings;
                
                const volumeReduction = ((actualVolume - optimalVolume) / actualVolume * 100);
                
                detailedDiscrepancies.push({
                  order_id: order.order_id,
                  actual_box: `${dims.length}"×${dims.width}"×${dims.height}" (Estimated)`,
                  optimal_box: `${optimalPackaging.name} (${optimalSku})`,
                  actual_volume: actualVolume,
                  optimal_volume: optimalVolume,
                  volume_reduction_percent: volumeReduction,
                  material_savings: estimatedMaterialSavings,
                  shipping_savings: shippingImpact.savings,
                  total_savings: totalSavings,
                  actual_dimensions: `${dims.length}"×${dims.width}"×${dims.height}"`,
                  optimal_dimensions: `${optimalPackaging.length_in}"×${optimalPackaging.width_in}"×${optimalPackaging.height_in}"`,
                  confidence: 75, // Lower confidence for estimated boxes
                  potential_savings: totalSavings
                });
              }
            }
          }
        }
        
        orderAnalyses.push({
          order_id: order.order_id,
          recommended_box_id: optimalSku,
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
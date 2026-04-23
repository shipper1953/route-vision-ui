import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Dims = { length: number; width: number; height: number };
type ItemDims = Dims & { quantity: number };

// Sort 3 dims descending
function sortedDesc(d: Dims): [number, number, number] {
  return [d.length, d.width, d.height].sort((a, b) => b - a) as [number, number, number];
}

// Per-item fit: each item's longest side must fit the box's longest side, etc.
// (Simple bounding-box rotation check — not a true 3D bin packer, but catches the
// common bug where a long item is "fit" into a small box because volume math passes.)
function allItemsFitInBox(items: ItemDims[], box: Dims): boolean {
  const [bL, bW, bH] = sortedDesc(box);
  for (const it of items) {
    const [iL, iW, iH] = sortedDesc(it);
    if (iL > bL || iW > bW || iH > bH) return false;
  }
  return true;
}

function totalItemVolume(items: ItemDims[]): number {
  let v = 0;
  for (const it of items) {
    v += it.length * it.width * it.height * (it.quantity || 1);
  }
  return v;
}

function boxVolume(box: Dims): number {
  return box.length * box.width * box.height;
}

function utilizationPct(items: ItemDims[], box: Dims): number {
  const bv = boxVolume(box);
  if (bv <= 0) return 0;
  return Math.min(100, (totalItemVolume(items) / bv) * 100);
}

// Normalize an order item into a usable {length,width,height,quantity}.
// Tries inline dimensions first, then falls back to the items master lookup
// (passed in via itemMasterDims keyed by item.id / item.sku).
function normalizeOrderItem(
  rawItem: any,
  itemMasterDims?: Map<string, { length: number; width: number; height: number }>
): ItemDims | null {
  const quantity = Number(rawItem?.quantity || 1);

  // 1. Inline dims on the order line
  const inline = rawItem?.dimensions ?? rawItem;
  let length = Number(inline?.length);
  let width = Number(inline?.width);
  let height = Number(inline?.height);

  // 2. Lookup from items master by itemId, then sku
  if ((!length || !width || !height) && itemMasterDims) {
    const lookupKeys = [rawItem?.itemId, rawItem?.item_id, rawItem?.sku].filter(Boolean);
    for (const key of lookupKeys) {
      const m = itemMasterDims.get(String(key));
      if (m) {
        length = m.length;
        width = m.width;
        height = m.height;
        break;
      }
    }
  }

  if (!length || !width || !height) return null;
  return { length, width, height, quantity };
}

serve(async (req) => {
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

    // Last 60 days of shipments with packaging data
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: allShipments, error: shipmentsError } = await supabase
      .from('shipments')
      .select('id, created_at, actual_package_sku, package_dimensions, cost, total_weight')
      .not('actual_package_sku', 'is', null)
      .gte('created_at', sixtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(500);

    if (shipmentsError) throw new Error(`Shipments query failed: ${shipmentsError.message}`);
    console.log(`📦 Found ${allShipments?.length || 0} shipments`);

    // Match shipments to orders for THIS company only
    let matchedShipments: Array<{
      shipment_id: number;
      order_id: string;
      actual_package_sku: string;
      package_dimensions: any;
      cost: number | null;
      created_at: string;
      order_items: any[];
    }> = [];

    if (allShipments && allShipments.length > 0) {
      const shipmentIds = allShipments.map(s => s.id);

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_id, items, company_id, shipment_id')
        .eq('company_id', company_id)
        .in('shipment_id', shipmentIds);

      if (ordersError) throw new Error(`Orders query failed: ${ordersError.message}`);
      console.log(`📋 Found ${orders?.length || 0} orders for company ${company_id}`);

      const ordersByShipment = new Map<number, any>();
      (orders || []).forEach(o => {
        if (o.shipment_id != null) ordersByShipment.set(o.shipment_id, o);
      });

      for (const shipment of allShipments) {
        const order = ordersByShipment.get(shipment.id);
        if (!order) continue;
        if (!Array.isArray(order.items) || order.items.length === 0) continue;
        matchedShipments.push({
          shipment_id: shipment.id,
          order_id: order.order_id,
          actual_package_sku: shipment.actual_package_sku,
          package_dimensions: shipment.package_dimensions,
          cost: shipment.cost,
          created_at: shipment.created_at,
          order_items: order.items,
        });
      }
    }

    console.log(`✅ Matched ${matchedShipments.length} shipments with orders`);

    // Build an items-master dimension lookup for all itemIds/skus referenced
    // by the matched orders. Order line items often only carry { itemId, sku }
    // and rely on the items table for actual dimensions.
    const itemKeys = new Set<string>();
    for (const ms of matchedShipments) {
      for (const it of (ms.order_items as any[])) {
        if (it?.itemId) itemKeys.add(String(it.itemId));
        if (it?.item_id) itemKeys.add(String(it.item_id));
        if (it?.sku) itemKeys.add(String(it.sku));
      }
    }

    const itemMasterDims = new Map<string, { length: number; width: number; height: number }>();
    if (itemKeys.size > 0) {
      const keys = Array.from(itemKeys);
      const ids = keys.filter(k => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k));
      const skus = keys.filter(k => !ids.includes(k));

      const [byIdRes, bySkuRes] = await Promise.all([
        ids.length
          ? supabase.from('items').select('id, sku, length, width, height').in('id', ids)
          : Promise.resolve({ data: [], error: null } as any),
        skus.length
          ? supabase.from('items').select('id, sku, length, width, height').in('sku', skus)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const rows = [...((byIdRes as any).data || []), ...((bySkuRes as any).data || [])];
      for (const r of rows) {
        const dims = { length: Number(r.length), width: Number(r.width), height: Number(r.height) };
        if (!dims.length || !dims.width || !dims.height) continue;
        if (r.id) itemMasterDims.set(String(r.id), dims);
        if (r.sku) itemMasterDims.set(String(r.sku), dims);
      }
      console.log(`📐 Loaded dimensions for ${itemMasterDims.size} item keys`);
    }

    // Master list (U-Line / vendor catalog) — the universe of candidate boxes
    const { data: masterListBoxes, error: masterError } = await supabase
      .from('packaging_master_list')
      .select('id, name, vendor_sku, length_in, width_in, height_in, cost, vendor, type')
      .eq('is_active', true)
      .eq('type', 'box');

    if (masterError) throw new Error(`Master list query failed: ${masterError.message}`);
    console.log(`📦 Found ${masterListBoxes?.length || 0} master-list boxes`);

    // Pre-sort master boxes by volume ascending — first one that fits is the tightest
    const sortedMasterBoxes = (masterListBoxes || [])
      .filter(b => b.length_in && b.width_in && b.height_in)
      .map(b => ({
        ...b,
        length: Number(b.length_in),
        width: Number(b.width_in),
        height: Number(b.height_in),
        cost: Number(b.cost) || 0,
        volume: Number(b.length_in) * Number(b.width_in) * Number(b.height_in),
      }))
      .sort((a, b) => a.volume - b.volume);

    // Build a SKU lookup so we can resolve "actual" dims/cost from the catalog,
    // not from free-form package_dimensions which often gets overridden at label time.
    const masterBySku = new Map<string, typeof sortedMasterBoxes[number]>();
    sortedMasterBoxes.forEach(b => masterBySku.set(b.vendor_sku, b));

    // Also load company boxes as a fallback (custom boxes not in vendor catalog)
    const { data: companyBoxes } = await supabase
      .from('boxes')
      .select('sku, name, length, width, height, cost')
      .eq('company_id', company_id)
      .eq('is_active', true);

    const companyBoxBySku = new Map<string, { sku: string; name: string; length: number; width: number; height: number; cost: number }>();
    (companyBoxes || []).forEach(b => {
      if (b.sku) {
        companyBoxBySku.set(b.sku, {
          sku: b.sku,
          name: b.name,
          length: Number(b.length),
          width: Number(b.width),
          height: Number(b.height),
          cost: Number(b.cost) || 0,
        });
      }
    });

    // Resolve the actual box used (dims + cost) for a shipment.
    // Priority: vendor master list -> company boxes -> raw package_dimensions.
    function resolveActualBox(actualSku: string, packageDims: any): { dims: Dims; cost: number; source: 'master' | 'company' | 'package_dims' } | null {
      const fromMaster = masterBySku.get(actualSku);
      if (fromMaster) {
        return { dims: { length: fromMaster.length, width: fromMaster.width, height: fromMaster.height }, cost: fromMaster.cost, source: 'master' };
      }
      const fromCompany = companyBoxBySku.get(actualSku);
      if (fromCompany) {
        return { dims: { length: fromCompany.length, width: fromCompany.width, height: fromCompany.height }, cost: fromCompany.cost, source: 'company' };
      }
      // Fallback: parse package_dimensions
      let parsed: any = packageDims;
      try {
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      } catch {
        return null;
      }
      const length = Number(parsed?.length);
      const width = Number(parsed?.width);
      const height = Number(parsed?.height);
      if (!length || !width || !height) return null;
      return { dims: { length, width, height }, cost: 0, source: 'package_dims' };
    }

    // ============ Analyze each shipment ============
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
        savings: number;
      }>;
      total_improvement: number;
      total_savings: number;
    }> = {};

    let totalUtilization = 0;
    let utilizationCount = 0;
    const allAnalysisResults: Array<{ shipment_id: number; actual_utilization: number; has_opportunity: boolean }> = [];

    const VOLUME_SLACK = 0.95;       // Treat boxes as "full" at 95% volume to leave room for void fill
    const MIN_IMPROVEMENT_PP = 10;   // Only flag opportunities that beat actual by >=10 percentage points

    for (const shipment of matchedShipments) {
      const items = (shipment.order_items as any[])
        .map(it => normalizeOrderItem(it, itemMasterDims))
        .filter((x): x is ItemDims => x !== null);

      if (items.length === 0) continue;

      const actual = resolveActualBox(shipment.actual_package_sku, shipment.package_dimensions);
      if (!actual) continue;

      const actualUtil = utilizationPct(items, actual.dims);
      if (actualUtil > 0) {
        totalUtilization += actualUtil;
        utilizationCount++;
      }

      // Find the smallest master-list box that fits all items (per-dim) AND has
      // total item volume <= 95% of box volume. Since sortedMasterBoxes is sorted
      // by volume ascending, the FIRST match is the tightest fit.
      const itemsVol = totalItemVolume(items);
      let bestMaster: typeof sortedMasterBoxes[number] | null = null;
      for (const mb of sortedMasterBoxes) {
        if (mb.vendor_sku === shipment.actual_package_sku) continue; // skip self-recommendation
        if (itemsVol > mb.volume * VOLUME_SLACK) continue;
        if (!allItemsFitInBox(items, { length: mb.length, width: mb.width, height: mb.height })) continue;
        bestMaster = mb;
        break;
      }

      let hasOpportunity = false;
      if (bestMaster) {
        const newUtil = utilizationPct(items, { length: bestMaster.length, width: bestMaster.width, height: bestMaster.height });
        const improvement = newUtil - actualUtil;

        if (improvement >= MIN_IMPROVEMENT_PP) {
          hasOpportunity = true;
          // Savings = positive cost delta between actual box and recommended box.
          // If actual cost is unknown (source = package_dims), savings defaults to 0
          // for that shipment — the opportunity still surfaces via the utilization gap.
          const savings = Math.max(0, actual.cost - bestMaster.cost);

          const key = bestMaster.vendor_sku;
          if (!masterBoxOpportunities[key]) {
            masterBoxOpportunities[key] = {
              master_box_sku: bestMaster.vendor_sku,
              master_box_name: bestMaster.name,
              master_box_vendor: bestMaster.vendor,
              master_box_cost: bestMaster.cost,
              shipments: [],
              total_improvement: 0,
              total_savings: 0,
            };
          }
          masterBoxOpportunities[key].shipments.push({
            shipment_id: shipment.shipment_id,
            order_id: shipment.order_id,
            current_box_sku: shipment.actual_package_sku,
            current_utilization: actualUtil,
            new_utilization: newUtil,
            improvement,
            savings,
          });
          masterBoxOpportunities[key].total_improvement += improvement;
          masterBoxOpportunities[key].total_savings += savings;

          console.log(`✨ Shipment ${shipment.shipment_id}: ${shipment.actual_package_sku} (${actualUtil.toFixed(1)}%) → ${bestMaster.vendor_sku} (${newUtil.toFixed(1)}%), save $${savings.toFixed(2)}`);
        }
      }

      allAnalysisResults.push({
        shipment_id: shipment.shipment_id,
        actual_utilization: actualUtil,
        has_opportunity: hasOpportunity,
      });
    }

    // Build, rank, and slice top opportunities
    const topOpportunities = Object.values(masterBoxOpportunities)
      .map(opp => {
        const n = opp.shipments.length;
        const avgCurrent = opp.shipments.reduce((s, x) => s + x.current_utilization, 0) / n;
        const avgNew = opp.shipments.reduce((s, x) => s + x.new_utilization, 0) / n;
        return {
          master_box_sku: opp.master_box_sku,
          master_box_name: opp.master_box_name,
          master_box_vendor: opp.master_box_vendor,
          master_box_cost: opp.master_box_cost,
          shipment_count: n,
          avg_current_utilization: avgCurrent.toFixed(1),
          avg_new_utilization: avgNew.toFixed(1),
          avg_improvement: (opp.total_improvement / n).toFixed(1),
          total_savings: parseFloat(opp.total_savings.toFixed(2)),
          sample_shipments: opp.shipments.slice(0, 3).map(s => s.shipment_id),
        };
      })
      // Sort by total_savings desc, then by shipment_count desc as tiebreaker
      .sort((a, b) => (b.total_savings - a.total_savings) || (b.shipment_count - a.shipment_count))
      .slice(0, 10);

    console.log(`✨ Found ${topOpportunities.length} packaging opportunities`);

    const averageUtilization = utilizationCount > 0 ? totalUtilization / utilizationCount : 0;

    // Most-used boxes
    const boxUsage: Record<string, number> = {};
    matchedShipments.forEach(s => {
      if (s.actual_package_sku) {
        boxUsage[s.actual_package_sku] = (boxUsage[s.actual_package_sku] || 0) + 1;
      }
    });
    const mostUsedBoxes = Object.entries(boxUsage)
      .map(([sku, count]) => ({
        box_sku: sku,
        usage_count: count,
        percentage_of_shipments: ((count / Math.max(matchedShipments.length, 1)) * 100).toFixed(1),
      }))
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 5);

    const totalPotentialSavings = topOpportunities.reduce((sum, opp) => sum + opp.total_savings, 0);

    const projectedNeed: Record<string, number> = {};
    mostUsedBoxes.forEach(box => {
      projectedNeed[box.box_sku] = Math.ceil(box.usage_count * 2);
    });

    const report = {
      company_id,
      generated_at: new Date().toISOString(),
      analysis_period: 'Last 60 days',
      total_orders_analyzed: matchedShipments.length,
      potential_savings: parseFloat(totalPotentialSavings.toFixed(2)),
      top_5_most_used_boxes: mostUsedBoxes,
      top_5_box_discrepancies: topOpportunities,
      inventory_suggestions: topOpportunities.slice(0, 5),
      projected_packaging_need: projectedNeed,
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
          poor: allAnalysisResults.filter(r => r.actual_utilization < 50).length,
        },
      },
    };

    // Replace today's report for this company
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

    if (reportError) throw new Error(`Failed to save report: ${reportError.message}`);

    console.log('✅ Report generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        shipments_analyzed: matchedShipments.length,
        total_savings: totalPotentialSavings,
        average_utilization: averageUtilization,
        optimization_opportunities: topOpportunities.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

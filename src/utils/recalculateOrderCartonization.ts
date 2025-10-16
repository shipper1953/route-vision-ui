import { supabase } from "@/integrations/supabase/client";
import { CartonizationEngine } from "@/services/cartonization/cartonizationEngine";

interface RecalculateResult {
  orderId: number;
  success: boolean;
  error?: string;
  boxName?: string;
}

/**
 * Recalculate cartonization for a single order
 */
export async function recalculateOrderCartonization(orderId: number): Promise<RecalculateResult> {
  try {
    // Fetch the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, items, company_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { orderId, success: false, error: 'Order not found' };
    }

    // Parse order items
    const orderItems = Array.isArray(order.items) ? order.items : [];
    
    if (orderItems.length === 0) {
      return { orderId, success: false, error: 'No items in order' };
    }

    // Fetch item master data for dimensions
    const { data: masterItems, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('company_id', order.company_id);

    if (itemsError || !masterItems) {
      return { orderId, success: false, error: 'Failed to fetch item master data' };
    }

    // Enrich order items with dimensions
    const enrichedItems = orderItems
      .map((orderItem: any) => {
        const masterItem = masterItems.find(m => m.sku === orderItem.sku || m.id === orderItem.itemId);
        if (masterItem) {
          return {
            id: masterItem.id,
            name: masterItem.name,
            sku: masterItem.sku,
            length: Number(masterItem.length),
            width: Number(masterItem.width),
            height: Number(masterItem.height),
            weight: Number(masterItem.weight),
            quantity: orderItem.quantity || 1,
            category: 'order_item' as const
          };
        }
        return null;
      })
      .filter(Boolean);

    if (enrichedItems.length === 0) {
      return { orderId, success: false, error: 'No items with dimensions found' };
    }

    // Fetch company boxes
    const { data: boxes, error: boxError } = await supabase
      .from('boxes')
      .select('*')
      .eq('company_id', order.company_id)
      .eq('is_active', true);

    if (boxError || !boxes || boxes.length === 0) {
      return { orderId, success: false, error: 'No active boxes found' };
    }

    // Run cartonization
    const engine = new CartonizationEngine(boxes.map(box => ({
      id: box.id,
      name: box.name,
      sku: box.sku || '',
      length: Number(box.length),
      width: Number(box.width),
      height: Number(box.height),
      maxWeight: Number(box.max_weight),
      cost: Number(box.cost),
      inStock: box.in_stock,
      minStock: box.min_stock || 10,
      maxStock: box.max_stock || 100,
      type: box.box_type as 'box' | 'poly_bag' | 'envelope' | 'tube' | 'custom'
    })));

    let result = engine.calculateOptimalBox(enrichedItems, false);
    let multiPackageResult = null;

    // Try multi-package if needed
    if (!result || result.confidence < 60) {
      multiPackageResult = engine.calculateMultiPackageCartonization(enrichedItems, 'balanced');
      
      if (multiPackageResult) {
        result = {
          recommendedBox: multiPackageResult.packages[0].box,
          utilization: multiPackageResult.packages[0].utilization,
          itemsFit: true,
          totalWeight: multiPackageResult.totalWeight,
          totalVolume: multiPackageResult.totalVolume,
          dimensionalWeight: multiPackageResult.packages[0].dimensionalWeight,
          savings: 0,
          confidence: multiPackageResult.confidence,
          alternatives: [],
          rulesApplied: multiPackageResult.rulesApplied,
          processingTime: multiPackageResult.processingTime,
          multiPackageResult: multiPackageResult
        };
      }
    }

    if (!result || !result.recommendedBox) {
      return { orderId, success: false, error: 'No suitable box found' };
    }

    // Calculate weights
    const itemsWeight = enrichedItems.reduce((sum: number, item: any) => sum + (item.weight * item.quantity), 0);
    const boxWeight = result.recommendedBox.cost * 0.1;
    const totalWeight = itemsWeight + boxWeight;

    // Store cartonization data
    const cartonizationRecord = {
      order_id: orderId,
      recommended_box_id: result.recommendedBox.id,
      recommended_box_data: {
        ...result.recommendedBox,
        multiPackageResult: multiPackageResult || null
      },
      utilization: Number(result.utilization),
      confidence: Number(result.confidence),
      total_weight: Number(totalWeight),
      items_weight: Number(itemsWeight),
      box_weight: Number(boxWeight),
      calculation_timestamp: new Date().toISOString(),
      packages: multiPackageResult?.packages || [],
      total_packages: multiPackageResult?.totalPackages || 1,
      splitting_strategy: multiPackageResult?.splittingStrategy || null,
      optimization_objective: multiPackageResult?.optimizationObjective || 'balanced'
    };

    const { error: cartonError } = await supabase
      .from('order_cartonization')
      .upsert(cartonizationRecord, {
        onConflict: 'order_id'
      });

    if (cartonError) {
      return { orderId, success: false, error: `Database error: ${cartonError.message}` };
    }

    return {
      orderId,
      success: true,
      boxName: result.recommendedBox.name
    };

  } catch (error) {
    console.error(`Error recalculating cartonization for order ${orderId}:`, error);
    return {
      orderId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Recalculate cartonization for multiple orders
 */
export async function recalculateBulkOrderCartonization(
  orderIds: number[],
  onProgress?: (current: number, total: number, result: RecalculateResult) => void
): Promise<RecalculateResult[]> {
  const results: RecalculateResult[] = [];

  for (let i = 0; i < orderIds.length; i++) {
    const result = await recalculateOrderCartonization(orderIds[i]);
    results.push(result);
    
    if (onProgress) {
      onProgress(i + 1, orderIds.length, result);
    }

    // Small delay to avoid overwhelming the database
    if (i < orderIds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Find orders missing cartonization data
 */
export async function findOrdersMissingCartonization(companyId?: string): Promise<number[]> {
  try {
    let query = supabase
      .from('orders')
      .select('id')
      .in('status', ['processing', 'ready_to_ship'])
      .order('created_at', { ascending: false });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError || !orders) {
      console.error('Error fetching orders:', ordersError);
      return [];
    }

    const orderIds = orders.map(o => o.id);

    // Check which orders don't have cartonization data
    const { data: cartonizations, error: cartonError } = await supabase
      .from('order_cartonization')
      .select('order_id')
      .in('order_id', orderIds);

    if (cartonError) {
      console.error('Error fetching cartonizations:', cartonError);
      return orderIds;
    }

    const cartonizedOrderIds = new Set(cartonizations?.map(c => c.order_id) || []);
    return orderIds.filter(id => !cartonizedOrderIds.has(id));

  } catch (error) {
    console.error('Error finding orders missing cartonization:', error);
    return [];
  }
}

import { supabase } from "@/integrations/supabase/client";

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

    // Collect item IDs and SKUs from order items for targeted lookup
    const itemIds = orderItems.map((i: any) => i.itemId).filter(Boolean);
    const itemSkus = orderItems.map((i: any) => i.sku).filter(Boolean);

    // Fetch item master data by ID/SKU scoped to the order company
    let masterItems: any[] = [];
    if (itemIds.length > 0) {
      const { data, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('company_id', order.company_id)
        .in('id', itemIds);
      if (!itemsError && data) masterItems = data;
    }
    // Supplement with SKU matches scoped to the order company
    if (itemSkus.length > 0) {
      const { data, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('company_id', order.company_id)
        .in('sku', itemSkus);
      if (!itemsError && data) {
        const byId = new Map<string, any>(masterItems.map(item => [item.id, item]));
        data.forEach(item => byId.set(item.id, item));
        masterItems = Array.from(byId.values());
      }
    }

    if (!masterItems || masterItems.length === 0) {
      return { orderId, success: false, error: 'Failed to fetch item master data' };
    }

    // Enrich order items with dimensions
    const enrichedItems = orderItems
      .map((orderItem: any) => {
        const masterItem = masterItems.find(m => m.id === orderItem.itemId) ||
          masterItems.find(m => m.sku === orderItem.sku && m.company_id === order.company_id);
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

    // Run canonical packaging-decision (single source of truth).
    const { data: decisionData, error: decisionError } = await supabase.functions.invoke(
      'packaging-decision',
      {
        body: {
          order_id: Number(orderId),
          items: enrichedItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            length: Number(item.length),
            width: Number(item.width),
            height: Number(item.height),
            weight: Number(item.weight),
            quantity: Number(item.quantity || 1),
            fragility: item.fragility || 'low',
            category: item.category || 'order_item'
          }))
        }
      }
    );

    if (decisionError || decisionData?.error || !decisionData?.recommended?.box_name) {
      return {
        orderId,
        success: false,
        error: `Failed to recalculate via packaging-decision: ${decisionError?.message || decisionData?.error || 'No recommendation returned'}`
      };
    }

    return {
      orderId,
      success: true,
      boxName: decisionData.recommended.box_name
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

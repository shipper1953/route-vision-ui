import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ShipmentRow = Database["public"]["Tables"]["shipments"]["Row"];
type OrderShipmentRow = Database["public"]["Tables"]["order_shipments"]["Row"];

const getQuantityTotal = (items: unknown): number => {
  if (Array.isArray(items)) {
    return items.reduce((sum, item: any) => {
      const quantity = Number(item?.quantity ?? item?.count ?? 1);
      return sum + (Number.isFinite(quantity) ? quantity : 1);
    }, 0);
  }

  if (typeof items === 'string') {
    try {
      return getQuantityTotal(JSON.parse(items));
    } catch {
      return 0;
    }
  }

  if (typeof items === 'number') {
    return Number.isFinite(items) ? items : 0;
  }

  return 0;
};

const getPackageInfoQuantityTotal = (packageInfo: unknown): { shipped: number; hasItemData: boolean } => {
  if (!packageInfo || typeof packageInfo !== 'object') {
    return { shipped: 0, hasItemData: false };
  }

  const items = (packageInfo as any).items;
  if (!Array.isArray(items)) {
    return { shipped: 0, hasItemData: false };
  }

  return {
    shipped: getQuantityTotal(items),
    hasItemData: true,
  };
};

/**
 * Shared utility for hydrating orders with shipment and qboid data
 * Used by fetchOrders, fetchOrdersPaginated, and fetchOrderById
 * 
 * OPTIMIZATION: Consolidates all enrichment logic in one place to avoid duplication
 */
export async function hydrateOrdersWithShipments(orders: any[], includeQboid: boolean = false) {
  if (orders.length === 0) return [];

  const numericOrderIds = orders.map(order => order.id);
  const shopifyStoreIds = Array.from(
    new Set(
      orders
        .map(order => order.shopify_store_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  );
  const directShipmentIdSet = new Set(
    orders
      .map(order => order.shipment_id)
      .filter((id): id is number => typeof id === 'number' && !Number.isNaN(id))
  );

  // Prepare parallel queries - wrap all in proper promises
  const orderShipmentPromise = numericOrderIds.length
    ? supabase
        .from('order_shipments')
        .select('order_id, shipment_id, package_info')
        .in('order_id', numericOrderIds)
    : Promise.resolve({ data: [] as OrderShipmentRow[], error: null });
  
  const directShipmentsPromise = directShipmentIdSet.size
    ? supabase
        .from('shipments')
        .select('*')
        .in('id', Array.from(directShipmentIdSet))
    : Promise.resolve({ data: [] as ShipmentRow[], error: null });

  // OPTIMIZATION: Fetch qboid data if requested
  const qboidPromise = includeQboid
    ? (async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        return await supabase
          .from('qboid_events')
          .select('*')
          .eq('event_type', 'dimensions_received')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(200);
      })()
    : Promise.resolve({ data: null, error: null });

  const shopifyMappingsPromise = numericOrderIds.length
    ? supabase
        .from('shopify_order_mappings')
        .select('ship_tornado_order_id, shopify_order_id, shopify_order_number')
        .in('ship_tornado_order_id', numericOrderIds)
    : Promise.resolve({ data: [], error: null });

  const shopifyStoresPromise = shopifyStoreIds.length
    ? supabase
        .from('shopify_stores')
        .select('id, store_url')
        .in('id', shopifyStoreIds)
    : Promise.resolve({ data: [], error: null });

  // Execute all queries in parallel
  const [orderShipmentResult, directShipmentsResult, qboidResult, shopifyMappingsResult, shopifyStoresResult] = await Promise.all([
    orderShipmentPromise,
    directShipmentsPromise,
    qboidPromise,
    shopifyMappingsPromise,
    shopifyStoresPromise
  ]);

  if (orderShipmentResult.error) {
    console.error('Error fetching order shipment links:', orderShipmentResult.error);
  }

  if (directShipmentsResult.error) {
    console.error('Error fetching direct shipments:', directShipmentsResult.error);
  }

  const orderShipmentLinks = orderShipmentResult.data ?? [];
  const shipmentsById = new Map<number, ShipmentRow>();

  (directShipmentsResult.data ?? []).forEach(shipment => {
    shipmentsById.set(shipment.id, shipment);
  });

  const missingShipmentIds = new Set<number>();
  for (const link of orderShipmentLinks) {
    if (link.shipment_id && !shipmentsById.has(link.shipment_id)) {
      missingShipmentIds.add(link.shipment_id);
    }
  }

  if (missingShipmentIds.size) {
    const additionalShipmentsResult = await supabase
      .from('shipments')
      .select('*')
      .in('id', Array.from(missingShipmentIds));

    if (additionalShipmentsResult.error) {
      console.error('Error fetching linked shipments:', additionalShipmentsResult.error);
    }

    (additionalShipmentsResult.data ?? []).forEach(shipment => {
      shipmentsById.set(shipment.id, shipment);
    });
  }

  const linkedShipmentByOrderId = new Map<number, ShipmentRow>();
  const fulfillmentByOrderId = new Map<number, { shipped: number; hasItemData: boolean }>();
  orderShipmentLinks.forEach(link => {
    const shipment = shipmentsById.get(link.shipment_id);
    if (shipment && !linkedShipmentByOrderId.has(link.order_id)) {
      linkedShipmentByOrderId.set(link.order_id, shipment);
    }

    const current = fulfillmentByOrderId.get(link.order_id) || { shipped: 0, hasItemData: false };
    const pkg = getPackageInfoQuantityTotal(link.package_info);
    fulfillmentByOrderId.set(link.order_id, {
      shipped: current.shipped + pkg.shipped,
      hasItemData: current.hasItemData || pkg.hasItemData,
    });
  });

  const shopifyMappingByOrderId = new Map<number, { shopify_order_id: string; shopify_order_number: string | null }>();
  (shopifyMappingsResult.data ?? []).forEach((mapping: any) => {
    shopifyMappingByOrderId.set(mapping.ship_tornado_order_id, {
      shopify_order_id: mapping.shopify_order_id,
      shopify_order_number: mapping.shopify_order_number
    });
  });

  const shopifyStoreUrlById = new Map<string, string>();
  (shopifyStoresResult.data ?? []).forEach((store: any) => {
    if (store.id && store.store_url) {
      shopifyStoreUrlById.set(
        store.id,
        String(store.store_url).replace(/^https?:\/\//, '').replace(/\/$/, '')
      );
    }
  });

  // OPTIMIZATION: Build qboid map if data was fetched
  const qboidMap = new Map<string, any>();
  if (includeQboid && qboidResult?.data) {
    const orderIdLinks = orders.map(order => `ORD-${order.order_id || order.id}`);
    const relevantQboidData = qboidResult.data.filter((event: any) => {
      const eventData = event.data as any;
      const orderId = eventData?.orderId || eventData?.barcode;
      return orderId && orderIdLinks.includes(orderId);
    });

    relevantQboidData.forEach((event: any) => {
      const eventData = event.data as any;
      if (eventData && (eventData.orderId || eventData.barcode)) {
        const orderId = eventData.orderId || eventData.barcode;
        if (!qboidMap.has(orderId)) {
          qboidMap.set(orderId, eventData);
        }
      }
    });
  }

  return orders.map(order => {
    const fulfillmentSummary = fulfillmentByOrderId.get(order.id);
    const computedItemsTotal = (() => {
      const existing = Number(order.items_total);
      if (Number.isFinite(existing) && existing > 0) return existing;
      return getQuantityTotal(order.items);
    })();

    const computedItemsShipped = fulfillmentSummary?.hasItemData
      ? (computedItemsTotal > 0
          ? Math.min(fulfillmentSummary.shipped, computedItemsTotal)
          : fulfillmentSummary.shipped)
      : Number(order.items_shipped ?? 0);

    const computedFulfillmentPercentage = computedItemsTotal > 0
      ? (computedItemsShipped / computedItemsTotal) * 100
      : Number(order.fulfillment_percentage ?? 0);

    const computedFulfillmentStatus = fulfillmentSummary?.hasItemData
      ? (computedItemsTotal > 0 && computedItemsShipped >= computedItemsTotal
          ? 'fulfilled'
          : computedItemsShipped > 0
            ? 'partially_fulfilled'
            : 'unfulfilled')
      : order.fulfillment_status;

    const shipmentFromOrder =
      (typeof order.shipment_id === 'number' ? shipmentsById.get(order.shipment_id) : undefined) ||
      linkedShipmentByOrderId.get(order.id) ||
      null;

    const enhancedOrder = {
      ...order,
      items_total: computedItemsTotal || order.items_total,
      items_shipped: computedItemsShipped,
      fulfillment_percentage: computedFulfillmentPercentage,
      fulfillment_status: computedFulfillmentStatus,
      shopify_order_id: shopifyMappingByOrderId.get(order.id)?.shopify_order_id || null,
      shopify_order_number: shopifyMappingByOrderId.get(order.id)?.shopify_order_number || null,
      shopify_store_url: order.shopify_store_id ? shopifyStoreUrlById.get(order.shopify_store_id) || null : null,
      shipment_data: shipmentFromOrder
        ? {
            id: shipmentFromOrder.easypost_id || String(shipmentFromOrder.id),
            carrier: shipmentFromOrder.carrier,
            service: shipmentFromOrder.service,
            trackingNumber: shipmentFromOrder.tracking_number || 'Pending',
            trackingUrl:
              shipmentFromOrder.tracking_url ||
              (shipmentFromOrder.tracking_number
                ? `https://www.trackingmore.com/track/en/${shipmentFromOrder.tracking_number}`
                : null),
            estimatedDeliveryDate: shipmentFromOrder.estimated_delivery_date,
            actualDeliveryDate: shipmentFromOrder.actual_delivery_date,
            cost: shipmentFromOrder.cost,
            labelUrl: shipmentFromOrder.label_url
          }
        : null
    };

    // Add qboid dimensions if available
    if (includeQboid) {
      const orderIdLink = `ORD-${order.order_id || order.id}`;
      const qboidDimensions = qboidMap.get(orderIdLink);
      
      if (qboidDimensions) {
        enhancedOrder.qboid_dimensions = {
          length: qboidDimensions.dimensions?.length || qboidDimensions.length,
          width: qboidDimensions.dimensions?.width || qboidDimensions.width,
          height: qboidDimensions.dimensions?.height || qboidDimensions.height,
          weight: qboidDimensions.dimensions?.weight || qboidDimensions.weight,
          orderId: qboidDimensions.orderId || qboidDimensions.barcode
        };
      }
    }

    return enhancedOrder;
  });
}

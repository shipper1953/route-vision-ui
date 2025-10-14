
import { OrderData } from "@/types/orderTypes";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { convertSupabaseToOrderData } from "./orderDataParser";

type ShipmentRow = Database["public"]["Tables"]["shipments"]["Row"];
type OrderShipmentRow = Database["public"]["Tables"]["order_shipments"]["Row"];

/**
 * Fetches all orders with shipment data
 * @returns An array of order data
 */
export async function fetchOrders(): Promise<OrderData[]> {
  console.log("Fetching orders from Supabase");

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error("Error fetching orders from Supabase:", error);
      return [];
    }

    if (!orders || orders.length === 0) {
      console.log("No orders found in Supabase");
      return [];
    }

    console.log(`Found ${orders.length} orders in Supabase`);

    const numericOrderIds = orders.map(order => order.id);
    const directShipmentIds = orders
      .map(order => order.shipment_id)
      .filter((id): id is number => typeof id === 'number' && !Number.isNaN(id));

    const orderShipmentResult = await (
      numericOrderIds.length
        ? supabase
            .from('order_shipments')
            .select('order_id, shipment_id')
            .in('order_id', numericOrderIds)
        : Promise.resolve({ data: [] as OrderShipmentRow[], error: null })
    );

    const orderShipmentLinks = orderShipmentResult.data ?? [];
    if (orderShipmentResult.error) {
      console.error('Error fetching order shipment links:', orderShipmentResult.error);
    }

    const shipmentIds = new Set<number>(directShipmentIds);
    for (const link of orderShipmentLinks) {
      if (link.shipment_id) {
        shipmentIds.add(link.shipment_id);
      }
    }

    const shipmentsResult = shipmentIds.size
      ? await supabase
          .from('shipments')
          .select('*')
          .in('id', Array.from(shipmentIds))
      : { data: [] as ShipmentRow[], error: null };

    if (shipmentsResult.error) {
      console.error('Error fetching shipments:', shipmentsResult.error);
    }

    const shipments = shipmentsResult.data ?? [];
    const shipmentsById = new Map<number, ShipmentRow>();
    shipments.forEach(shipment => {
      shipmentsById.set(shipment.id, shipment);
    });

    const linkedShipmentByOrderId = new Map<number, ShipmentRow>();
    orderShipmentLinks.forEach(link => {
      const shipment = shipmentsById.get(link.shipment_id);
      if (shipment && !linkedShipmentByOrderId.has(link.order_id)) {
        linkedShipmentByOrderId.set(link.order_id, shipment);
      }
    });

    const ordersWithRelatedData = orders.map(order => {
      const shipmentFromOrder =
        (typeof order.shipment_id === 'number' ? shipmentsById.get(order.shipment_id) : undefined) ||
        linkedShipmentByOrderId.get(order.id) ||
        null;

      return {
        ...order,
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
    });

    return ordersWithRelatedData.map(order => convertSupabaseToOrderData(order));
  } catch (err) {
    console.error("Error fetching orders from Supabase:", err);
    return [];
  }
}

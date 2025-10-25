
import { OrderData } from "@/types/orderTypes";
import { supabase } from "@/integrations/supabase/client";
import { convertSupabaseToOrderData } from "./orderDataParser";
import { hydrateOrdersWithShipments } from "./orderShipmentHydration";

/**
 * Fetches all orders with shipment data
 * @deprecated Use fetchOrdersPaginated() instead for better performance
 * @returns An array of order data (limited to 500 most recent)
 */
export async function fetchOrders(): Promise<OrderData[]> {
  console.warn("⚠️ fetchOrders() is deprecated. Use fetchOrdersPaginated() for better performance.");
  console.log("Fetching orders from Supabase (limited to 500)");

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id, order_id, customer_name, customer_company, customer_email, customer_phone,
        status, order_date, required_delivery_date, value, items, shipping_address,
        qboid_dimensions, user_id, company_id, warehouse_id, created_at,
        estimated_delivery_date, actual_delivery_date, shipment_id
      `)
      .order('id', { ascending: false })
      .limit(500);

    if (error) {
      console.error("Error fetching orders from Supabase:", error);
      return [];
    }

    if (!orders || orders.length === 0) {
      console.log("No orders found in Supabase");
      return [];
    }

    console.log(`Found ${orders.length} orders in Supabase`);

    // Use shared hydration utility to avoid code duplication
    const ordersWithRelatedData = await hydrateOrdersWithShipments(orders);

    return ordersWithRelatedData.map(order => convertSupabaseToOrderData(order));
  } catch (err) {
    console.error("Error fetching orders from Supabase:", err);
    return [];
  }
}

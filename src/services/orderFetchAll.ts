
import { OrderData } from "@/types/orderTypes";
import { supabase } from "@/integrations/supabase/client";
import { convertSupabaseToOrderData } from "./orderDataParser";
import { hydrateOrdersWithShipments } from "./orderShipmentHydration";

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

    // Use shared hydration utility to avoid code duplication
    const ordersWithRelatedData = await hydrateOrdersWithShipments(orders);

    return ordersWithRelatedData.map(order => convertSupabaseToOrderData(order));
  } catch (err) {
    console.error("Error fetching orders from Supabase:", err);
    return [];
  }
}

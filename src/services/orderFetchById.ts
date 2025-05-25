
import { OrderData } from "@/types/orderTypes";
import { supabase } from "@/integrations/supabase/client";
import { convertSupabaseToOrderData } from "./orderDataParser";

/**
 * Fetches an order by its ID
 * @param orderId The ID of the order to fetch
 * @returns The order data or null if not found
 */
export async function fetchOrderById(orderId: string): Promise<OrderData | null> {
  // Simulate API delay for better UX
  await new Promise(resolve => setTimeout(resolve, 800));
  
  try {
    // Remove "ORD-" prefix if present for order_id lookup
    const searchId = orderId.startsWith('ORD-') ? orderId : `ORD-${orderId}`;
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', searchId)
      .single();
    
    if (error || !data) {
      console.log("Order not found in Supabase:", orderId, error);
      return null;
    }
    
    console.log("Raw order data from Supabase:", data);
    
    const orderData = convertSupabaseToOrderData(data);
    console.log("Final parsed order data:", orderData);
    
    return orderData;
  } catch (err) {
    console.error("Error fetching order from Supabase:", err);
    return null;
  }
}

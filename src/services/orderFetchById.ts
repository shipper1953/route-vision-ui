
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
    
    // Also check for Qboid dimension data
    const { data: qboidData } = await supabase
      .from('qboid_events')
      .select('*')
      .eq('event_type', 'dimensions_received')
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Find matching Qboid data by order ID in the data payload
    let matchingQboidData = null;
    if (qboidData && qboidData.length > 0) {
      console.log("Found Qboid events:", qboidData.length);
      
      for (const event of qboidData) {
        const eventData = event.data as any; // Type assertion for JSON data
        if (eventData && (eventData.orderId === searchId || eventData.barcode === searchId)) {
          console.log("Found matching Qboid data for order:", searchId, eventData);
          matchingQboidData = eventData;
          break;
        }
      }
    }
    
    // Merge Qboid data if found
    if (matchingQboidData) {
      console.log("Merging Qboid dimensions with order data");
      data.qboid_dimensions = {
        length: matchingQboidData.dimensions?.length || matchingQboidData.length,
        width: matchingQboidData.dimensions?.width || matchingQboidData.width,
        height: matchingQboidData.dimensions?.height || matchingQboidData.height,
        weight: matchingQboidData.dimensions?.weight || matchingQboidData.weight,
        orderId: matchingQboidData.orderId || matchingQboidData.barcode
      };
    }
    
    const orderData = convertSupabaseToOrderData(data);
    console.log("Final parsed order data:", orderData);
    
    return orderData;
  } catch (err) {
    console.error("Error fetching order from Supabase:", err);
    return null;
  }
}


import { OrderData } from "@/types/orderTypes";
import { supabase } from "@/integrations/supabase/client";

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
    
    // Parse shipment tracking data if available
    let shipmentInfo;
    if ((data as any).tracking) {
      try {
        shipmentInfo = JSON.parse((data as any).tracking);
      } catch (e) {
        console.warn("Failed to parse tracking data:", e);
      }
    }
    
    // Convert Supabase data format to our OrderData format
    return {
      id: data.order_id,
      customerName: (data as any).customer_name || "Unknown Customer",
      orderDate: (data as any).order_date || new Date().toISOString().split('T')[0],
      requiredDeliveryDate: (data as any).required_delivery_date || new Date().toISOString().split('T')[0],
      status: (data as any).status || "processing",
      items: typeof data.items === 'number' ? data.items : 1,
      value: data.value?.toString() || "0",
      shippingAddress: (data as any).shipping_address ? JSON.parse((data as any).shipping_address) : {},
      shipment: shipmentInfo || ((data as any).tracking_number ? {
        id: `SHIP-${data.id}`,
        carrier: "Unknown",
        service: "Standard",
        trackingNumber: (data as any).tracking_number,
        trackingUrl: `https://www.trackingmore.com/track/en/${(data as any).tracking_number}`
      } : undefined)
    };
  } catch (err) {
    console.error("Error fetching order from Supabase:", err);
    return null;
  }
}

/**
 * Fetches all orders
 * @returns An array of order data
 */
export async function fetchOrders(): Promise<OrderData[]> {
  // Simulate API delay for better UX
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log("Fetching orders from Supabase");
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('id', { ascending: false });
    
    if (error) {
      console.error("Error fetching orders from Supabase:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log("No orders found in Supabase");
      return [];
    }
    
    console.log(`Found ${data.length} orders in Supabase`);
    
    // Convert Supabase data to our OrderData format
    const supabaseOrders: OrderData[] = data.map(order => {
      // Parse shipment tracking data if available
      let shipmentInfo;
      if ((order as any).tracking) {
        try {
          shipmentInfo = JSON.parse((order as any).tracking);
        } catch (e) {
          console.warn("Failed to parse tracking data for order", order.id, e);
        }
      }
      
      return {
        id: order.order_id || `ORD-${order.id}`,
        customerName: (order as any).customer_name || "Unknown Customer",
        orderDate: (order as any).order_date || new Date().toISOString().split('T')[0],
        requiredDeliveryDate: (order as any).required_delivery_date || new Date().toISOString().split('T')[0],
        status: (order as any).status || "processing",
        items: typeof order.items === 'number' ? order.items : 1,
        value: order.value?.toString() || "0",
        shippingAddress: (order as any).shipping_address ? JSON.parse((order as any).shipping_address) : {},
        shipment: shipmentInfo || ((order as any).tracking_number ? {
          id: `SHIP-${order.id}`,
          carrier: "Unknown",
          service: "Standard",
          trackingNumber: (order as any).tracking_number,
          trackingUrl: `https://www.trackingmore.com/track/en/${(order as any).tracking_number}`
        } : undefined)
      };
    });
    
    return supabaseOrders;
  } catch (err) {
    console.error("Error fetching orders from Supabase:", err);
    return [];
  }
}

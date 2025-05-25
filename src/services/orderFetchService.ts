
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
        // Only parse if it's a string
        if (typeof (data as any).tracking === 'string') {
          shipmentInfo = JSON.parse((data as any).tracking);
        } else {
          shipmentInfo = (data as any).tracking;
        }
      } catch (e) {
        console.warn("Failed to parse tracking data:", e);
      }
    }
    
    // Parse shipping address from JSON
    let shippingAddress = {};
    if (data.shipping_address) {
      try {
        // Only parse if it's a string
        if (typeof data.shipping_address === 'string') {
          shippingAddress = JSON.parse(data.shipping_address);
        } else {
          shippingAddress = data.shipping_address;
        }
      } catch (e) {
        console.warn("Failed to parse shipping address:", e);
        shippingAddress = {};
      }
    }
    
    // Convert Supabase data format to our OrderData format
    return {
      id: data.order_id,
      customerName: data.customer_name || "Unknown Customer",
      customerCompany: data.customer_company || "",
      customerEmail: data.customer_email || "",
      customerPhone: data.customer_phone || "",
      orderDate: data.order_date || new Date().toISOString().split('T')[0],
      requiredDeliveryDate: data.required_delivery_date || new Date().toISOString().split('T')[0],
      status: data.status || "processing",
      items: typeof data.items === 'number' ? data.items : 1,
      value: data.value?.toString() || "0",
      shippingAddress: shippingAddress as any,
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
          // Only parse if it's a string
          if (typeof (order as any).tracking === 'string') {
            shipmentInfo = JSON.parse((order as any).tracking);
          } else {
            shipmentInfo = (order as any).tracking;
          }
        } catch (e) {
          console.warn("Failed to parse tracking data for order", order.id, e);
        }
      }
      
      // Parse shipping address from JSON
      let shippingAddress = {};
      if (order.shipping_address) {
        try {
          // Only parse if it's a string
          if (typeof order.shipping_address === 'string') {
            shippingAddress = JSON.parse(order.shipping_address);
          } else {
            shippingAddress = order.shipping_address;
          }
        } catch (e) {
          console.warn("Failed to parse shipping address for order", order.id, e);
          shippingAddress = {};
        }
      }
      
      return {
        id: order.order_id || `ORD-${order.id}`,
        customerName: order.customer_name || "Unknown Customer",
        customerCompany: order.customer_company || "",
        customerEmail: order.customer_email || "",
        customerPhone: order.customer_phone || "",
        orderDate: order.order_date || new Date().toISOString().split('T')[0],
        requiredDeliveryDate: order.required_delivery_date || new Date().toISOString().split('T')[0],
        status: order.status || "processing",
        items: typeof order.items === 'number' ? order.items : 1,
        value: order.value?.toString() || "0",
        shippingAddress: shippingAddress as any,
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

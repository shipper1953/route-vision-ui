
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
    
    console.log("Raw order data from Supabase:", data);
    
    // Parse shipment tracking data if available
    let shipmentInfo;
    if (data.tracking) {
      try {
        if (typeof data.tracking === 'string') {
          shipmentInfo = JSON.parse(data.tracking);
        } else if (typeof data.tracking === 'object' && data.tracking !== null) {
          shipmentInfo = data.tracking;
        }
      } catch (e) {
        console.warn("Failed to parse tracking data:", e);
      }
    }
    
    // Parse shipping address from JSON with better error handling
    let shippingAddress = {};
    if (data.shipping_address) {
      try {
        if (typeof data.shipping_address === 'string') {
          const parsed = JSON.parse(data.shipping_address);
          if (parsed && typeof parsed === 'object') {
            shippingAddress = parsed;
          }
        } else if (typeof data.shipping_address === 'object' && data.shipping_address !== null) {
          shippingAddress = data.shipping_address;
        }
        console.log("Parsed shipping address:", shippingAddress);
      } catch (e) {
        console.warn("Failed to parse shipping address:", e);
        shippingAddress = {};
      }
    } else {
      console.warn("No shipping address found in order data");
    }

    // Parse Qboid dimensions if available with better error handling
    let parcelInfo;
    if (data.qboid_dimensions) {
      try {
        if (typeof data.qboid_dimensions === 'string') {
          const parsed = JSON.parse(data.qboid_dimensions);
          if (parsed && typeof parsed === 'object') {
            parcelInfo = parsed;
          }
        } else if (typeof data.qboid_dimensions === 'object' && data.qboid_dimensions !== null) {
          parcelInfo = data.qboid_dimensions;
        }
        console.log("Qboid dimensions found for order:", orderId, parcelInfo);
      } catch (e) {
        console.warn("Failed to parse Qboid dimensions:", e);
      }
    } else {
      console.warn("No Qboid dimensions found for order:", orderId);
    }
    
    // Convert Supabase data format to our OrderData format
    const orderData = {
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
      parcelInfo: parcelInfo, // Include Qboid dimensions as parcel info
      shipment: shipmentInfo || (data.tracking_number ? {
        id: `SHIP-${data.id}`,
        carrier: "Unknown",
        service: "Standard",
        trackingNumber: data.tracking_number,
        trackingUrl: `https://www.trackingmore.com/track/en/${data.tracking_number}`
      } : undefined)
    };
    
    console.log("Final parsed order data:", orderData);
    return orderData;
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

      // Parse Qboid dimensions if available
      let parcelInfo;
      if (order.qboid_dimensions) {
        try {
          // Only parse if it's a string
          if (typeof order.qboid_dimensions === 'string') {
            parcelInfo = JSON.parse(order.qboid_dimensions);
          } else {
            parcelInfo = order.qboid_dimensions;
          }
        } catch (e) {
          console.warn("Failed to parse Qboid dimensions for order", order.id, e);
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
        parcelInfo: parcelInfo, // Include Qboid dimensions as parcel info
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

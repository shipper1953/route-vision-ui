
import { OrderData } from "@/types/orderTypes";
import mockOrders from "@/data/mockOrdersData";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches an order by its ID
 * @param orderId The ID of the order to fetch
 * @returns The order data or null if not found
 */
export async function fetchOrderById(orderId: string): Promise<OrderData | null> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // First, try to find the order in our mock database
  const mockOrder = mockOrders.find(order => order.id === orderId);
  
  if (mockOrder) {
    // Return a copy of the order to avoid mutation
    return {...mockOrder};
  }
  
  // If not found in mock data, try to fetch from Supabase
  try {
    // Remove "ORD-" prefix if present for numeric ID lookup
    const numericId = orderId.startsWith('ORD-') ? parseInt(orderId.replace('ORD-', '')) : parseInt(orderId);
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', numericId)
      .single();
    
    if (error || !data) {
      console.log("Order not found in Supabase:", orderId);
      return null;
    }
    
    // Convert Supabase data format to our OrderData format
    return {
      id: `ORD-${data.id}`,
      customerName: data.customer_name,
      orderDate: data.order_date,
      requiredDeliveryDate: data.required_delivery_date,
      status: data.status || "processing",
      items: data.items || 0,
      value: data.value?.toString() || "0",
      shippingAddress: data.shipping_address ? JSON.parse(data.shipping_address) : {},
      shipment: data.tracking_number ? {
        id: `SHIP-${data.id}`,
        carrier: "Unknown",
        service: "Standard",
        trackingNumber: data.tracking_number,
        trackingUrl: `https://www.trackingmore.com/track/en/${data.tracking_number}`
      } : undefined
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
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log("Fetching orders, total count:", mockOrders.length);
  
  // Sort orders by date (newest first) to ensure newly created orders appear at the top
  const sortedMockOrders = [...mockOrders].sort((a, b) => {
    return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
  });
  
  // Try to fetch orders from Supabase
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('order_date', { ascending: false });
    
    if (error) {
      console.error("Error fetching orders from Supabase:", error);
      // Return mock data as fallback
      return sortedMockOrders;
    }
    
    if (!data || data.length === 0) {
      console.log("No orders found in Supabase, using mock data");
      return sortedMockOrders;
    }
    
    // Convert Supabase data to our OrderData format
    const supabaseOrders: OrderData[] = data.map(order => ({
      id: `ORD-${order.id}`,
      customerName: order.customer_name,
      orderDate: order.order_date,
      requiredDeliveryDate: order.required_delivery_date,
      status: order.status || "processing",
      items: order.items || 0,
      value: order.value?.toString() || "0",
      shippingAddress: order.shipping_address ? JSON.parse(order.shipping_address) : {},
      shipment: order.tracking_number ? {
        id: `SHIP-${order.id}`,
        carrier: "Unknown",
        service: "Standard",
        trackingNumber: order.tracking_number,
        trackingUrl: `https://www.trackingmore.com/track/en/${order.tracking_number}`
      } : undefined
    }));
    
    console.log("Found", supabaseOrders.length, "orders in Supabase");
    
    // Merge and deduplicate orders from both sources
    const allOrders = [...supabaseOrders];
    
    // Add mock orders that don't exist in Supabase
    for (const mockOrder of sortedMockOrders) {
      if (!allOrders.some(order => order.id === mockOrder.id)) {
        allOrders.push(mockOrder);
      }
    }
    
    return allOrders;
  } catch (err) {
    console.error("Error fetching orders from Supabase:", err);
    // Return mock data as fallback
    return sortedMockOrders;
  }
}

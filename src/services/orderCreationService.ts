
import { OrderData } from "@/types/orderTypes";
import mockOrders from "@/data/mockOrdersData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Creates a new order
 * @param orderData The order data to create
 * @returns The created order
 */
export async function createOrder(orderData: Omit<OrderData, 'id'>): Promise<OrderData> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // Generate a new order ID
  const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
  
  // Create the new order with the generated ID
  const newOrder: OrderData = {
    ...orderData,
    id: orderId
  };
  
  // Add to our mock database
  mockOrders.push(newOrder);
  
  // Store the order in Supabase
  try {
    const { error } = await supabase
      .from('orders')
      .insert({
        id: parseInt(orderId.replace('ORD-', '')), // Convert to numeric ID for Supabase
        customer_name: newOrder.customerName,
        order_date: newOrder.orderDate,
        required_delivery_date: newOrder.requiredDeliveryDate,
        status: newOrder.status,
        items: newOrder.items,
        value: parseFloat(newOrder.value),
        shipping_address: JSON.stringify(newOrder.shippingAddress),
        customer_id: (await supabase.auth.getUser()).data.user?.id
      });

    if (error) {
      console.error("Failed to store order in Supabase:", error);
      toast.error("Order created but failed to sync to database");
    } else {
      console.log("Order successfully stored in Supabase");
    }
  } catch (err) {
    console.error("Error storing order in Supabase:", err);
  }
  
  console.log("New order created:", orderId, "Total orders:", mockOrders.length);
  
  // Return a copy of the new order
  return {...newOrder};
}


import { OrderData } from "@/types/orderTypes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Creates a new order
 * @param orderData The order data to create
 * @returns The created order
 */
export async function createOrder(orderData: Omit<OrderData, 'id'>): Promise<OrderData> {
  // Simulate API delay for better UX
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // Generate a new order ID
  const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
  
  // Create the new order with the generated ID
  const newOrder: OrderData = {
    ...orderData,
    id: orderId,
    status: "ready_to_ship" // Ensure new orders are set to ready_to_ship
  };
  
  // Store the order in Supabase
  try {
    // Get the current user (if authenticated)
    const { data: { user } } = await supabase.auth.getUser();
    
    console.log("Saving order to Supabase:", {
      order_id: orderId,
      items: JSON.stringify([{ count: newOrder.items, description: "Order items" }]),
      value: parseFloat(newOrder.value),
      shipping_address: JSON.stringify(newOrder.shippingAddress),
      customer_name: newOrder.customerName,
      customer_company: newOrder.customerCompany,
      customer_email: newOrder.customerEmail,
      customer_phone: newOrder.customerPhone,
      order_date: newOrder.orderDate,
      required_delivery_date: newOrder.requiredDeliveryDate,
      status: newOrder.status,
      user_id: user?.id || null
    });
    
    const { data, error } = await supabase
      .from('orders')
      .insert({
        order_id: orderId,
        items: JSON.stringify([{ count: newOrder.items, description: "Order items" }]),
        value: parseFloat(newOrder.value),
        user_id: user?.id || null
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to store order in Supabase:", error);
      toast.error("Failed to create order in database");
      throw error;
    } else {
      console.log("Order successfully stored in Supabase:", data);
      toast.success(`Order ${orderId} created successfully!`);
    }
  } catch (err) {
    console.error("Error storing order in Supabase:", err);
    throw err;
  }
  
  console.log("New order created:", orderId);
  
  // Return the new order
  return newOrder;
}

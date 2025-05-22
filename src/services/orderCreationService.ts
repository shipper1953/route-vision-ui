
import { OrderData } from "@/types/orderTypes";
import mockOrders from "@/data/mockOrdersData";

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
  
  // Return a copy of the new order
  return {...newOrder};
}

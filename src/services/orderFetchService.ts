
import { OrderData } from "@/types/orderTypes";
import mockOrders from "@/data/mockOrdersData";

/**
 * Fetches an order by its ID
 * @param orderId The ID of the order to fetch
 * @returns The order data or null if not found
 */
export async function fetchOrderById(orderId: string): Promise<OrderData | null> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // In a real application, this would make an API call to your backend
  const order = mockOrders.find(order => order.id === orderId);
  
  if (!order) {
    return null;
  }
  
  // Return a copy of the order to avoid mutation
  return {...order};
}

/**
 * Fetches all orders
 * @returns An array of order data
 */
export async function fetchOrders(): Promise<OrderData[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return a copy of orders to avoid mutation
  return [...mockOrders];
}

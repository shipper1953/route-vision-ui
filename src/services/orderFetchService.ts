/**
 * Unified order fetching service
 * 
 * This service provides a clean API for fetching orders with proper pagination
 * and caching. All new code should use this service instead of the legacy
 * fetchOrders() function.
 */

import { fetchOrdersPaginated, PaginatedOrdersResult } from "./orderFetchPaginated";
import { OrderData } from "@/types/orderTypes";

/**
 * Fetches all orders for a given status with automatic pagination
 * 
 * @param status - Order status to filter by (optional)
 * @param maxOrders - Maximum number of orders to fetch (default: 1000)
 * @returns Array of OrderData
 */
export async function fetchOrdersByStatus(
  status?: string,
  maxOrders: number = 1000
): Promise<OrderData[]> {
  const pageSize = 50; // Fetch in batches of 50
  const allOrders: OrderData[] = [];
  let currentPage = 1;
  let hasMore = true;

  while (hasMore && allOrders.length < maxOrders) {
    const result = await fetchOrdersPaginated(currentPage, pageSize);
    
    // Filter by status if provided
    const filteredOrders = status
      ? result.orders.filter(order => order.status === status)
      : result.orders;
    
    allOrders.push(...filteredOrders);
    
    hasMore = result.hasNextPage && allOrders.length < maxOrders;
    currentPage++;
    
    if (import.meta.env.DEV) {
      console.log(`Fetched ${allOrders.length} orders (page ${currentPage - 1})`);
    }
  }

  return allOrders.slice(0, maxOrders);
}

/**
 * Fetches ready-to-ship orders with pagination
 * 
 * @param maxOrders - Maximum number of orders to fetch
 * @returns Array of OrderData
 */
export async function fetchReadyToShipOrders(maxOrders: number = 1000): Promise<OrderData[]> {
  return fetchOrdersByStatus('ready_to_ship', maxOrders);
}

/**
 * Fetches orders in processing status
 * 
 * @param maxOrders - Maximum number of orders to fetch
 * @returns Array of OrderData
 */
export async function fetchProcessingOrders(maxOrders: number = 1000): Promise<OrderData[]> {
  return fetchOrdersByStatus('processing', maxOrders);
}

/**
 * Fetches all orders with automatic pagination
 * Use sparingly - prefer specific status filters when possible
 * 
 * @param maxOrders - Maximum number of orders to fetch
 * @returns Array of OrderData
 */
export async function fetchAllOrders(maxOrders: number = 1000): Promise<OrderData[]> {
  return fetchOrdersByStatus(undefined, maxOrders);
}


import { useState, useEffect } from 'react';
import { Shipment } from "@/components/shipment/ShipmentsTable";
import { fetchOrdersPaginated } from "@/services/orderFetchPaginated";
import { extractShipmentsFromOrders } from "@/utils/shipmentDataUtils";

/**
 * Custom hook to load shipments from orders using paginated API
 * OPTIMIZATION: Uses paginated fetching instead of loading all orders
 */
export const useOrderShipments = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadShipmentsFromOrders = async () => {
      try {
        const allOrders = [];
        let page = 1;
        let hasMore = true;
        const pageSize = 50;

        // Fetch orders with pagination until we get all shipped orders
        while (hasMore) {
          const result = await fetchOrdersPaginated(page, pageSize, undefined, 'shipped');
          allOrders.push(...result.orders);
          
          hasMore = result.hasNextPage;
          page++;
          
          // Safety limit to prevent infinite loops
          if (page > 20) break;
        }
        
        const orderShipments = extractShipmentsFromOrders(allOrders);
        console.log("Found shipments from orders:", orderShipments.length);
        setShipments(orderShipments);
      } catch (err) {
        console.error("Error getting shipments from orders:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setShipments([]);
      } finally {
        setLoading(false);
      }
    };

    loadShipmentsFromOrders();
  }, []);

  return { shipments, loading, error };
};

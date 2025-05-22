
import { useState, useEffect } from 'react';
import { Shipment } from "@/components/shipment/ShipmentsTable";
import { fetchOrders } from "@/services/orderService";
import { extractShipmentsFromOrders } from "@/utils/shipmentDataUtils";

/**
 * Custom hook to load shipments from orders
 */
export const useOrderShipments = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadShipmentsFromOrders = async () => {
      try {
        const orders = await fetchOrders();
        const orderShipments = extractShipmentsFromOrders(orders);
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

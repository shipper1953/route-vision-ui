
// Re-export types from separate type file
export * from "@/types/orderTypes";

// Re-export functions from separate service files
export { fetchOrderById, fetchOrders } from "./orderFetchService";
export { createOrder } from "./orderCreationService";
export { linkShipmentToOrder, updateOrderWithShipment } from "./orderShipmentService";

// Export default object with all functions for compatibility
import { fetchOrderById, fetchOrders } from "./orderFetchService";
import { createOrder } from "./orderCreationService";
import { linkShipmentToOrder, updateOrderWithShipment } from "./orderShipmentService";

export default {
  fetchOrderById,
  fetchOrders,
  createOrder,
  updateOrderWithShipment,
  linkShipmentToOrder
};


// Re-export types from separate type file
export * from "@/types/orderTypes";

// Re-export functions from separate service files
export { fetchOrderById } from "./orderFetchById";
export { fetchAllOrders as fetchOrders } from "./orderFetchService"; // Backward compatibility
export { createOrder } from "./orderCreationService";
export { linkShipmentToOrder, updateOrderWithShipment } from "./orderShipmentService";

// Export default object with all functions for compatibility
import { fetchOrderById } from "./orderFetchById";
import { fetchAllOrders } from "./orderFetchService";
import { createOrder } from "./orderCreationService";
import { linkShipmentToOrder, updateOrderWithShipment } from "./orderShipmentService";

export default {
  fetchOrderById,
  fetchOrders: fetchAllOrders, // Backward compatibility
  createOrder,
  updateOrderWithShipment,
  linkShipmentToOrder
};

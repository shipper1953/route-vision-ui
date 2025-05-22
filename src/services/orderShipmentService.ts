
import { OrderData, ShipmentInfo } from "@/types/orderTypes";
import mockOrders from "@/data/mockOrdersData";

/**
 * Links a shipment to an order and updates its status
 * @param orderId The ID of the order to update
 * @param shipmentInfo The shipment information to link
 * @returns The updated order or null if not found
 */
export async function linkShipmentToOrder(
  orderId: string,
  shipmentInfo: ShipmentInfo
): Promise<OrderData | null> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // Find the order
  const orderIndex = mockOrders.findIndex(order => order.id === orderId);
  
  if (orderIndex === -1) {
    return null;
  }
  
  // Update the order with shipment info and change status to shipped
  mockOrders[orderIndex].shipment = shipmentInfo;
  mockOrders[orderIndex].status = "shipped";
  
  // Return a copy of the updated order
  return {...mockOrders[orderIndex]};
}

/**
 * Updates an order with shipment information
 * @param orderId The ID of the order to update
 * @param shipmentId The ID of the associated shipment
 * @param trackingCode The tracking code for the shipment
 * @returns The updated order or null if not found
 */
export async function updateOrderWithShipment(
  orderId: string,
  shipmentId: string,
  trackingCode: string
): Promise<OrderData | null> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // In a real application, this would make an API call to update the order
  const orderIndex = mockOrders.findIndex(order => order.id === orderId);
  
  if (orderIndex === -1) {
    return null;
  }
  
  // Update the order status
  mockOrders[orderIndex].status = "shipped";
  
  // In a real app, you would also associate the shipment ID and tracking code
  
  // Return a copy of the updated order
  return {...mockOrders[orderIndex]};
}

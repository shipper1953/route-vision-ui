
import { OrderData, ShipmentInfo } from "@/types/orderTypes";
import { linkShipmentToOrder } from "./orderShipmentLinking";

/**
 * Updates an order with shipment information
 * @param orderId The ID of the order to update
 * @param shipmentInfo The shipment info to update
 * @returns The updated order
 * @deprecated Use linkShipmentToOrder instead
 */
export async function updateOrderWithShipment(orderId: string | number, shipmentInfo: ShipmentInfo): Promise<OrderData> {
  return linkShipmentToOrder(orderId, shipmentInfo).then(() => {
    return { id: String(orderId) } as OrderData;
  });
}

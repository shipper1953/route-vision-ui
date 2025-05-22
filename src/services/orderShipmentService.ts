
import { supabase } from "@/integrations/supabase/client";
import { OrderData, ShipmentInfo } from "@/types/orderTypes";
import { toast } from "sonner";

/**
 * Links a shipment to an order
 * @param orderId The ID of the order to update
 * @param shipmentInfo The shipment info to link
 */
export async function linkShipmentToOrder(orderId: string, shipmentInfo: ShipmentInfo): Promise<void> {
  try {
    console.log(`Linking shipment to order ${orderId}:`, shipmentInfo);
    
    // Remove "ORD-" prefix if present for numeric ID lookup
    const numericId = orderId.startsWith('ORD-') ? parseInt(orderId.replace('ORD-', '')) : parseInt(orderId);
    
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'shipped',
        tracking_number: shipmentInfo.trackingNumber
      })
      .eq('id', numericId);
    
    if (error) {
      console.error("Error linking shipment to order:", error);
      toast.error("Failed to update order with shipment information");
      throw error;
    }
    
    toast.success(`Order ${orderId} marked as shipped`);
    
  } catch (err) {
    console.error("Error linking shipment to order:", err);
    throw err;
  }
}

/**
 * Updates an order with shipment information
 * @param orderId The ID of the order to update
 * @param shipmentInfo The shipment info to update
 * @returns The updated order
 * @deprecated Use linkShipmentToOrder instead
 */
export async function updateOrderWithShipment(orderId: string, shipmentInfo: ShipmentInfo): Promise<OrderData> {
  return linkShipmentToOrder(orderId, shipmentInfo).then(() => {
    return { id: orderId } as OrderData;
  });
}

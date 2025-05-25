
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
    
    // Remove "ORD-" prefix if present for order_id lookup
    const searchId = orderId.startsWith('ORD-') ? orderId : `ORD-${orderId}`;
    
    // Format shipment details for JSON storage
    const shipmentDetails = {
      id: shipmentInfo.id,
      carrier: shipmentInfo.carrier,
      service: shipmentInfo.service,
      trackingNumber: shipmentInfo.trackingNumber,
      trackingUrl: shipmentInfo.trackingUrl,
      estimatedDeliveryDate: shipmentInfo.estimatedDeliveryDate,
      labelUrl: shipmentInfo.labelUrl
    };
    
    // Update the order with shipment details as JSON and set status to shipped
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'shipped',
        tracking_number: shipmentInfo.trackingNumber,
        tracking: JSON.stringify(shipmentDetails)
      })
      .eq('order_id', searchId);
    
    if (error) {
      console.error("Error linking shipment to order:", error);
      toast.error("Failed to update order with shipment information");
      throw error;
    }
    
    // Show success message
    toast.success(`Order ${orderId} marked as shipped`);
    
    // Add a small delay before redirecting to give time for the database to update
    await new Promise(resolve => setTimeout(resolve, 300));
    
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

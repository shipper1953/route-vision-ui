
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
    
    // Find the shipment in the database by easypost_id
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('id')
      .eq('easypost_id', shipmentInfo.id)
      .maybeSingle();
    
    if (shipmentError) {
      console.error("Error finding shipment:", shipmentError);
    }
    
    if (shipment) {
      // Update the order with the shipment_id reference and change status to shipped
      const { error } = await supabase
        .from('orders')
        .update({ 
          shipment_id: shipment.id,
          status: 'shipped'
        })
        .eq('order_id', searchId);
      
      if (error) {
        console.error("Error linking shipment to order:", error);
        toast.error("Failed to update order with shipment information");
        throw error;
      }
      
      console.log(`Successfully linked shipment ${shipmentInfo.id} to order ${orderId} and updated status to shipped`);
      toast.success(`Order ${orderId} updated with shipment information and marked as shipped`);
      
      // Add a small delay before redirecting to give time for the database to update
      await new Promise(resolve => setTimeout(resolve, 300));
    } else {
      console.warn(`Shipment with easypost_id ${shipmentInfo.id} not found in database`);
      toast.warning("Shipment created but not linked to order in database");
    }
    
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

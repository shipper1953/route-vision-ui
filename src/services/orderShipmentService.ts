
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
    
    // Find the shipment in the database by easypost_id
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('id')
      .eq('easypost_id', shipmentInfo.id)
      .maybeSingle();
    
    if (shipmentError) {
      console.error("Error finding shipment:", shipmentError);
      toast.error("Error finding shipment in database");
      throw shipmentError;
    }
    
    if (shipment) {
      console.log(`Found shipment in database with id: ${shipment.id}`);
      
      // Try to update order using multiple strategies
      let updateResult = null;
      let updateError = null;
      
      // Strategy 1: Try with order_id_link (string field)
      const searchId = orderId.startsWith('ORD-') ? orderId : `ORD-${orderId}`;
      console.log("Attempting to update order with order_id_link:", searchId);
      
      const { error: linkError } = await supabase
        .from('orders')
        .update({ 
          shipment_id: shipment.id,
          status: 'shipped'
        })
        .eq('order_id_link', searchId);
      
      if (!linkError) {
        console.log(`Successfully linked shipment ${shipmentInfo.id} to order ${orderId} via order_id_link and updated status to shipped`);
        toast.success(`Order ${orderId} updated with shipment information and marked as shipped`);
        return;
      } else {
        console.warn("Failed to update via order_id_link:", linkError);
        updateError = linkError;
      }
      
      // Strategy 2: Try with numeric order_id if the first strategy failed
      const numericOrderId = orderId.replace('ORD-', '');
      if (!isNaN(Number(numericOrderId))) {
        console.log("Attempting to update order with numeric order_id:", numericOrderId);
        
        const { error: numericError } = await supabase
          .from('orders')
          .update({ 
            shipment_id: shipment.id,
            status: 'shipped'
          })
          .eq('order_id', parseInt(numericOrderId));
        
        if (!numericError) {
          console.log(`Successfully linked shipment ${shipmentInfo.id} to order ${orderId} via numeric order_id and updated status to shipped`);
          toast.success(`Order ${orderId} updated with shipment information and marked as shipped`);
          return;
        } else {
          console.error("Failed to update via numeric order_id:", numericError);
          updateError = numericError;
        }
      }
      
      // If both strategies failed, throw the last error
      if (updateError) {
        console.error("All update strategies failed. Last error:", updateError);
        toast.error("Failed to update order with shipment information");
        throw updateError;
      }
      
    } else {
      console.warn(`Shipment with easypost_id ${shipmentInfo.id} not found in database`);
      toast.warning("Shipment created but not found in database for linking");
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

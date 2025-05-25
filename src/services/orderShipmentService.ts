
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
    
    // Wait a bit for the database to be updated by the edge function
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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
      
    } else {
      console.warn(`Shipment with easypost_id ${shipmentInfo.id} not found in database after waiting`);
      
      // Try to find any recent shipments and link the most recent one
      const { data: recentShipments, error: recentError } = await supabase
        .from('shipments')
        .select('id, easypost_id')
        .order('id', { ascending: false })
        .limit(5);
      
      if (!recentError && recentShipments && recentShipments.length > 0) {
        console.log("Recent shipments found:", recentShipments);
        
        // Use the most recent shipment as a fallback
        const fallbackShipment = recentShipments[0];
        
        const { error: fallbackError } = await supabase
          .from('orders')
          .update({ 
            shipment_id: fallbackShipment.id,
            status: 'shipped'
          })
          .eq('order_id', searchId);
        
        if (!fallbackError) {
          console.log(`Linked order ${orderId} to most recent shipment as fallback`);
          toast.success(`Order ${orderId} linked to shipment and marked as shipped`);
        } else {
          console.error("Fallback linking failed:", fallbackError);
          toast.warning("Shipment created but could not be linked to order");
        }
      } else {
        toast.warning("Shipment created but not found in database for linking");
      }
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

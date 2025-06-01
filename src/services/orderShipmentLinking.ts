
import { supabase } from "@/integrations/supabase/client";
import { ShipmentInfo } from "@/types/orderTypes";
import { toast } from "sonner";

/**
 * Links a shipment to an order using multiple strategies
 * @param orderId The ID of the order to update (can be string or number)
 * @param shipmentInfo The shipment info to link
 */
export async function linkShipmentToOrder(orderId: string | number, shipmentInfo: ShipmentInfo): Promise<void> {
  try {
    const orderIdStr = String(orderId);
    console.log(`Linking shipment to order ${orderIdStr}:`, shipmentInfo);
    
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
      
      // Convert shipment.id to number - it comes as bigint from Supabase
      const shipmentIdNumber = Number(shipment.id);
      console.log(`Converted shipment ID to number: ${shipmentIdNumber}`);
      
      // Try to update order using multiple strategies
      let updateSuccess = false;
      
      // Strategy 1: Try with order_id as string if it contains non-numeric characters
      if (isNaN(Number(orderIdStr))) {
        console.log("Attempting to update order with string order_id:", orderIdStr);
        
        const { error: stringError } = await supabase
          .from('orders')
          .update({ 
            shipment_id: shipmentIdNumber,
            status: 'shipped'
          })
          .eq('order_id', orderIdStr);
        
        if (!stringError) {
          console.log(`Successfully linked shipment ${shipmentInfo.id} to order ${orderIdStr} via string order_id`);
          toast.success(`Order ${orderIdStr} updated with shipment information and marked as shipped`);
          updateSuccess = true;
        } else {
          console.warn("Failed to update via string order_id:", stringError);
        }
      }
      
      // Strategy 2: Try with numeric order_id if the first strategy failed
      if (!updateSuccess && !isNaN(Number(orderIdStr))) {
        console.log("Attempting to update order with numeric order_id:", orderIdStr);
        
        const { error: numericError } = await supabase
          .from('orders')
          .update({ 
            shipment_id: shipmentIdNumber,
            status: 'shipped'
          })
          .eq('order_id', orderIdStr);
        
        if (!numericError) {
          console.log(`Successfully linked shipment ${shipmentInfo.id} to order ${orderIdStr} via numeric order_id`);
          toast.success(`Order ${orderIdStr} updated with shipment information and marked as shipped`);
          updateSuccess = true;
        } else {
          console.error("Failed to update via numeric order_id:", numericError);
        }
      }
      
      // Strategy 3: Try with id field if numeric
      if (!updateSuccess && !isNaN(Number(orderIdStr))) {
        console.log("Attempting to update order with id field:", orderIdStr);
        
        const orderIdNumeric = parseInt(orderIdStr, 10);
        const { error: idError } = await supabase
          .from('orders')
          .update({ 
            shipment_id: shipmentIdNumber,
            status: 'shipped'
          })
          .eq('id', orderIdNumeric);
        
        if (!idError) {
          console.log(`Successfully linked shipment ${shipmentInfo.id} to order ${orderIdStr} via id field`);
          toast.success(`Order ${orderIdStr} updated with shipment information and marked as shipped`);
          updateSuccess = true;
        } else {
          console.error("Failed to update via id field:", idError);
        }
      }
      
      if (!updateSuccess) {
        console.error("All update strategies failed for order:", orderIdStr);
        toast.error("Failed to update order with shipment information");
        throw new Error("Failed to update order with shipment information");
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

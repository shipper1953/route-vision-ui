
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
      
      // Strategy 1: Try with order_id field first (most common case)
      console.log("Strategy 1: Attempting to update order with order_id:", orderIdStr);
      
      const { data: updatedOrderById, error: orderIdError } = await supabase
        .from('orders')
        .update({ 
          shipment_id: shipmentIdNumber,
          status: 'shipped'
        })
        .eq('order_id', orderIdStr)
        .select();
      
      if (!orderIdError && updatedOrderById && updatedOrderById.length > 0) {
        console.log(`✅ Successfully linked shipment ${shipmentInfo.id} to order ${orderIdStr} via order_id:`, updatedOrderById[0]);
        toast.success(`Order ${orderIdStr} updated with shipment information and marked as shipped`);
        updateSuccess = true;
      } else {
        console.warn("Strategy 1 failed:", orderIdError);
      }
      
      // Strategy 2: Try with numeric id field if the first strategy failed and orderId is numeric
      if (!updateSuccess && !isNaN(Number(orderIdStr))) {
        console.log("Strategy 2: Attempting to update order with numeric id:", orderIdStr);
        
        const orderIdNumeric = parseInt(orderIdStr, 10);
        const { data: updatedOrderByNumericId, error: numericIdError } = await supabase
          .from('orders')
          .update({ 
            shipment_id: shipmentIdNumber,
            status: 'shipped'
          })
          .eq('id', orderIdNumeric)
          .select();
        
        if (!numericIdError && updatedOrderByNumericId && updatedOrderByNumericId.length > 0) {
          console.log(`✅ Successfully linked shipment ${shipmentInfo.id} to order ${orderIdStr} via numeric id:`, updatedOrderByNumericId[0]);
          toast.success(`Order ${orderIdStr} updated with shipment information and marked as shipped`);
          updateSuccess = true;
        } else {
          console.error("Strategy 2 failed:", numericIdError);
        }
      }
      
      // Strategy 3: Broader search if all else fails
      if (!updateSuccess) {
        console.log("Strategy 3: Performing broader search for order...");
        
        // Search for order using ilike for case-insensitive matching
        const { data: foundOrder, error: searchError } = await supabase
          .from('orders')
          .select('id, order_id, customer_name')
          .or(`order_id.ilike.%${orderIdStr}%,id.eq.${isNaN(Number(orderIdStr)) ? 0 : Number(orderIdStr)}`)
          .maybeSingle();
        
        if (!searchError && foundOrder) {
          console.log(`Found order through broader search:`, foundOrder);
          const { data: finalUpdate, error: finalError } = await supabase
            .from('orders')
            .update({ 
              shipment_id: shipmentIdNumber,
              status: 'shipped'
            })
            .eq('id', foundOrder.id)
            .select();
          
          if (!finalError && finalUpdate && finalUpdate.length > 0) {
            console.log(`✅ Successfully linked via broader search:`, finalUpdate[0]);
            toast.success(`Order ${orderIdStr} updated with shipment information and marked as shipped`);
            updateSuccess = true;
          }
        }
      }
      
      if (!updateSuccess) {
        console.error("❌ All update strategies failed for order:", orderIdStr);
        
        // Show available orders for debugging
        const { data: debugOrders } = await supabase
          .from('orders')
          .select('id, order_id, customer_name, status')
          .limit(10);
        
        console.log("Available orders for debugging:", debugOrders);
        toast.error(`Failed to link shipment to order ${orderIdStr}. Order may not exist or may already be shipped.`);
        throw new Error("Failed to update order with shipment information");
      }
      
    } else {
      console.warn(`⚠️ Shipment with easypost_id ${shipmentInfo.id} not found in database`);
      toast.warning("Shipment created but not found in database for linking");
    }
    
  } catch (err) {
    console.error("❌ Error linking shipment to order:", err);
    throw err;
  }
}

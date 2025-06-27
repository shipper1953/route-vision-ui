
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
    console.log(`🔗 Linking shipment to order ${orderIdStr}:`, shipmentInfo);
    
    // Find the shipment in the database by easypost_id
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('id')
      .eq('easypost_id', shipmentInfo.id)
      .maybeSingle();
    
    if (shipmentError) {
      console.error("❌ Error finding shipment:", shipmentError);
      toast.error("Error finding shipment in database");
      throw shipmentError;
    }
    
    if (!shipment) {
      console.warn(`⚠️ Shipment with easypost_id ${shipmentInfo.id} not found in database`);
      toast.warning("Shipment created but not found in database for linking");
      return;
    }
    
    console.log(`✅ Found shipment in database with id: ${shipment.id}`);
    
    // Convert shipment.id to number - it comes as bigint from Supabase
    const shipmentIdNumber = Number(shipment.id);
    console.log(`🔢 Converted shipment ID to number: ${shipmentIdNumber}`);
    
    // Try to update order using multiple strategies
    let updateSuccess = false;
    let foundOrder = null;
    
    // Strategy 1: Try with order_id field first (most common case)
    console.log(`📝 Strategy 1: Searching for order with order_id: "${orderIdStr}"`);
    
    const { data: orderByOrderId, error: orderIdError } = await supabase
      .from('orders')
      .select('id, order_id, customer_name, status')
      .eq('order_id', orderIdStr)
      .maybeSingle();
    
    if (!orderIdError && orderByOrderId) {
      foundOrder = orderByOrderId;
      console.log(`✅ Found order by order_id:`, foundOrder);
    } else {
      console.log(`❌ Strategy 1 failed:`, orderIdError);
    }
    
    // Strategy 2: Try with numeric id field if the first strategy failed and orderId is numeric
    if (!foundOrder && !isNaN(Number(orderIdStr))) {
      console.log(`📝 Strategy 2: Searching for order with numeric id: ${orderIdStr}`);
      
      const orderIdNumeric = parseInt(orderIdStr, 10);
      const { data: orderById, error: numericIdError } = await supabase
        .from('orders')
        .select('id, order_id, customer_name, status')
        .eq('id', orderIdNumeric)
        .maybeSingle();
      
      if (!numericIdError && orderById) {
        foundOrder = orderById;
        console.log(`✅ Found order by numeric id:`, foundOrder);
      } else {
        console.log(`❌ Strategy 2 failed:`, numericIdError);
      }
    }
    
    // Strategy 3: Try case-insensitive search on order_id
    if (!foundOrder) {
      console.log(`📝 Strategy 3: Case-insensitive search for order_id: "${orderIdStr}"`);
      
      const { data: orderByCaseInsensitive, error: searchError } = await supabase
        .from('orders')
        .select('id, order_id, customer_name, status')
        .ilike('order_id', orderIdStr)
        .maybeSingle();
      
      if (!searchError && orderByCaseInsensitive) {
        foundOrder = orderByCaseInsensitive;
        console.log(`✅ Found order by case-insensitive search:`, foundOrder);
      } else {
        console.log(`❌ Strategy 3 failed:`, searchError);
      }
    }
    
    // If we found an order, try to update it
    if (foundOrder) {
      // Check if order is already shipped
      if (foundOrder.status === 'shipped') {
        console.log(`⚠️ Order ${foundOrder.order_id} is already shipped, skipping update`);
        toast.success(`Order ${orderIdStr} is already marked as shipped`);
        return;
      }
      
      console.log(`🔄 Updating order ${foundOrder.id} (order_id: ${foundOrder.order_id}) with shipment ${shipmentIdNumber}`);
      
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({ 
          shipment_id: shipmentIdNumber,
          status: 'shipped'
        })
        .eq('id', foundOrder.id)
        .select('id, order_id, status, shipment_id');
      
      if (!updateError && updatedOrder && updatedOrder.length > 0) {
        console.log(`✅ Successfully linked order ${orderIdStr} to shipment ${shipmentInfo.id}:`, updatedOrder[0]);
        toast.success(`Order ${orderIdStr} updated with shipment information and marked as shipped`);
        updateSuccess = true;
      } else {
        console.error(`❌ Failed to update order ${foundOrder.id}:`, updateError);
        toast.error(`Failed to update order ${orderIdStr} status`);
      }
    } else {
      console.error(`❌ Order ${orderIdStr} not found in database using any strategy`);
      
      // Log available orders for debugging
      const { data: debugOrders } = await supabase
        .from('orders')
        .select('id, order_id, customer_name, status')
        .order('id', { ascending: false })
        .limit(10);
      
      console.log('📋 Recent orders in database:');
      if (debugOrders && debugOrders.length > 0) {
        debugOrders.forEach(order => {
          console.log(`  - ID: ${order.id}, order_id: "${order.order_id}", customer: ${order.customer_name}, status: ${order.status}`);
        });
      } else {
        console.log('  - No orders found in database');
      }
      
      toast.error(`Order ${orderIdStr} not found. Please check the order ID.`);
    }
    
    if (!updateSuccess) {
      console.error(`❌ Failed to link order ${orderIdStr} to shipment ${shipmentInfo.id} using all strategies`);
      throw new Error("Failed to update order with shipment information");
    }
    
  } catch (err) {
    console.error("❌ Error linking shipment to order:", err);
    toast.error("Error linking shipment to order");
    throw err;
  }
}

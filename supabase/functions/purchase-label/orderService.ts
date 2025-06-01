
export async function linkShipmentToOrder(supabaseClient: any, orderId: string, finalShipmentId: number) {
  console.log(`Linking order ${orderId} to shipment ${finalShipmentId}`);
  
  // Try multiple strategies to find and update the order
  let orderUpdateSuccess = false;
  
  // Strategy 1: Try with the orderId as-is if it's a string ID
  if (isNaN(Number(orderId))) {
    console.log(`Attempting to link order ${orderId} (string) to shipment ${finalShipmentId}`);
    const { data: updatedOrder, error: orderUpdateError1 } = await supabaseClient
      .from('orders')
      .update({ 
        shipment_id: finalShipmentId,
        status: 'shipped'
      })
      .eq('order_id', orderId)
      .select();
    
    if (!orderUpdateError1 && updatedOrder && updatedOrder.length > 0) {
      console.log(`Successfully linked order ${orderId} to shipment via string order_id:`, updatedOrder[0]);
      orderUpdateSuccess = true;
    } else {
      console.log('Failed to update via string order_id:', orderUpdateError1);
    }
  }
  
  // Strategy 2: Try with numeric order_id if not successful yet
  if (!orderUpdateSuccess && !isNaN(Number(orderId))) {
    console.log(`Attempting to link order ${orderId} (numeric) to shipment ${finalShipmentId}`);
    const { data: updatedOrder, error: orderUpdateError2 } = await supabaseClient
      .from('orders')
      .update({ 
        shipment_id: finalShipmentId,
        status: 'shipped'
      })
      .eq('order_id', orderId)
      .select();
    
    if (!orderUpdateError2 && updatedOrder && updatedOrder.length > 0) {
      console.log(`Successfully linked order ${orderId} to shipment via numeric order_id:`, updatedOrder[0]);
      orderUpdateSuccess = true;
    } else {
      console.log('Failed to update via numeric order_id:', orderUpdateError2);
    }
  }
  
  // Strategy 3: Try with id field if numeric
  if (!orderUpdateSuccess && !isNaN(Number(orderId))) {
    const orderIdNumeric = parseInt(orderId, 10);
    console.log(`Attempting to link order ${orderIdNumeric} (id field) to shipment ${finalShipmentId}`);
    const { data: updatedOrder, error: orderUpdateError3 } = await supabaseClient
      .from('orders')
      .update({ 
        shipment_id: finalShipmentId,
        status: 'shipped'
      })
      .eq('id', orderIdNumeric)
      .select();
    
    if (!orderUpdateError3 && updatedOrder && updatedOrder.length > 0) {
      console.log(`Successfully linked order ${orderIdNumeric} to shipment via id field:`, updatedOrder[0]);
      orderUpdateSuccess = true;
    } else {
      console.log('Failed to update via id field:', orderUpdateError3);
    }
  }
  
  // Strategy 4: Debug - let's see what orders exist
  if (!orderUpdateSuccess) {
    console.log(`All strategies failed for order ${orderId}. Debugging...`);
    
    // Check what orders exist with similar IDs
    const { data: allOrders, error: debugError } = await supabaseClient
      .from('orders')
      .select('id, order_id, customer_name, status')
      .limit(10);
    
    if (debugError) {
      console.error('Debug query failed:', debugError);
    } else {
      console.log('Available orders for debugging:', allOrders);
    }
    
    // Try one more time with a broader search
    const { data: foundOrder, error: searchError } = await supabaseClient
      .from('orders')
      .select('id, order_id')
      .or(`order_id.eq.${orderId},id.eq.${isNaN(Number(orderId)) ? 0 : Number(orderId)}`)
      .maybeSingle();
    
    if (!searchError && foundOrder) {
      console.log(`Found order through broader search:`, foundOrder);
      const { data: finalUpdate, error: finalError } = await supabaseClient
        .from('orders')
        .update({ 
          shipment_id: finalShipmentId,
          status: 'shipped'
        })
        .eq('id', foundOrder.id)
        .select();
      
      if (!finalError && finalUpdate && finalUpdate.length > 0) {
        console.log(`Finally linked order via broader search:`, finalUpdate[0]);
        orderUpdateSuccess = true;
      }
    }
  }
  
  if (!orderUpdateSuccess) {
    console.error(`Failed to link order ${orderId} to shipment ${finalShipmentId} using all strategies`);
  }
  
  return orderUpdateSuccess;
}

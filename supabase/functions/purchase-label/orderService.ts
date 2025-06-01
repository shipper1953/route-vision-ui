
export async function linkShipmentToOrder(supabaseClient: any, orderId: string, finalShipmentId: number) {
  console.log(`Linking order ${orderId} to shipment ${finalShipmentId}`);
  
  // First, let's see what orders exist to understand the data structure
  const { data: debugOrders, error: debugError } = await supabaseClient
    .from('orders')
    .select('id, order_id, customer_name, status')
    .limit(5);
  
  if (debugError) {
    console.error('Debug query failed:', debugError);
  } else {
    console.log('Available orders for debugging:', debugOrders);
  }
  
  // Try to find the order using a broader search approach
  let orderUpdateSuccess = false;
  let foundOrder = null;
  
  // Strategy 1: Try to find order by order_id field (string match)
  console.log(`Searching for order with order_id: ${orderId}`);
  const { data: orderByOrderId, error: searchError1 } = await supabaseClient
    .from('orders')
    .select('id, order_id, customer_name')
    .eq('order_id', orderId)
    .maybeSingle();
  
  if (!searchError1 && orderByOrderId) {
    foundOrder = orderByOrderId;
    console.log(`Found order by order_id: ${orderId}`, foundOrder);
  }
  
  // Strategy 2: If not found and orderId is numeric, try by id field
  if (!foundOrder && !isNaN(Number(orderId))) {
    console.log(`Searching for order with id: ${orderId}`);
    const { data: orderById, error: searchError2 } = await supabaseClient
      .from('orders')
      .select('id, order_id, customer_name')
      .eq('id', parseInt(orderId, 10))
      .maybeSingle();
    
    if (!searchError2 && orderById) {
      foundOrder = orderById;
      console.log(`Found order by id: ${orderId}`, foundOrder);
    }
  }
  
  // Strategy 3: Try case-insensitive search on order_id
  if (!foundOrder) {
    console.log(`Searching for order with case-insensitive order_id: ${orderId}`);
    const { data: orderByCaseInsensitive, error: searchError3 } = await supabaseClient
      .from('orders')
      .select('id, order_id, customer_name')
      .ilike('order_id', orderId)
      .maybeSingle();
    
    if (!searchError3 && orderByCaseInsensitive) {
      foundOrder = orderByCaseInsensitive;
      console.log(`Found order by case-insensitive search: ${orderId}`, foundOrder);
    }
  }
  
  // If we found an order, try to update it
  if (foundOrder) {
    console.log(`Attempting to update order ${foundOrder.id} with shipment ${finalShipmentId}`);
    
    const { data: updatedOrder, error: updateError } = await supabaseClient
      .from('orders')
      .update({ 
        shipment_id: finalShipmentId,
        status: 'shipped'
      })
      .eq('id', foundOrder.id)
      .select();
    
    if (!updateError && updatedOrder && updatedOrder.length > 0) {
      console.log(`Successfully linked order ${orderId} to shipment ${finalShipmentId}:`, updatedOrder[0]);
      orderUpdateSuccess = true;
    } else {
      console.error(`Failed to update order ${foundOrder.id}:`, updateError);
    }
  } else {
    console.error(`Order ${orderId} not found in database`);
    
    // Log what orders are available for debugging
    const { data: allOrders } = await supabaseClient
      .from('orders')
      .select('id, order_id, customer_name, status')
      .limit(10);
    
    console.log('Available orders in database:', allOrders);
  }
  
  if (!orderUpdateSuccess) {
    console.error(`Failed to link order ${orderId} to shipment ${finalShipmentId}`);
  }
  
  return orderUpdateSuccess;
}

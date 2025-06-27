
export async function linkShipmentToOrder(supabaseClient: any, orderId: string, finalShipmentId: number) {
  console.log(`🔗 Linking order ${orderId} to shipment ${finalShipmentId}`);
  
  let orderUpdateSuccess = false;
  let foundOrder = null;
  
  // Strategy 1: Try exact match on order_id field
  console.log(`📝 Strategy 1: Searching for order with exact order_id: "${orderId}"`);
  const { data: orderByOrderId, error: searchError1 } = await supabaseClient
    .from('orders')
    .select('id, order_id, customer_name, status')
    .eq('order_id', orderId)
    .maybeSingle();
  
  if (!searchError1 && orderByOrderId) {
    foundOrder = orderByOrderId;
    console.log(`✅ Found order by exact order_id match:`, foundOrder);
  } else {
    console.log(`❌ Strategy 1 failed. Error:`, searchError1);
  }
  
  // Strategy 2: If not found and orderId is numeric, try by id field
  if (!foundOrder && !isNaN(Number(orderId))) {
    console.log(`📝 Strategy 2: Searching for order with numeric id: ${orderId}`);
    const { data: orderById, error: searchError2 } = await supabaseClient
      .from('orders')
      .select('id, order_id, customer_name, status')
      .eq('id', parseInt(orderId, 10))
      .maybeSingle();
    
    if (!searchError2 && orderById) {
      foundOrder = orderById;
      console.log(`✅ Found order by numeric id:`, foundOrder);
    } else {
      console.log(`❌ Strategy 2 failed. Error:`, searchError2);
    }
  }
  
  // Strategy 3: Try case-insensitive search on order_id
  if (!foundOrder) {
    console.log(`📝 Strategy 3: Searching for order with case-insensitive order_id: "${orderId}"`);
    const { data: orderByCaseInsensitive, error: searchError3 } = await supabaseClient
      .from('orders')
      .select('id, order_id, customer_name, status')
      .ilike('order_id', orderId)
      .maybeSingle();
    
    if (!searchError3 && orderByCaseInsensitive) {
      foundOrder = orderByCaseInsensitive;
      console.log(`✅ Found order by case-insensitive search:`, foundOrder);
    } else {
      console.log(`❌ Strategy 3 failed. Error:`, searchError3);
    }
  }
  
  // If we found an order, try to update it
  if (foundOrder) {
    // Check if order is already shipped
    if (foundOrder.status === 'shipped') {
      console.log(`⚠️ Order ${foundOrder.order_id} is already shipped, skipping update`);
      return true; // Return success since order is already in correct state
    }
    
    console.log(`🔄 Attempting to update order ${foundOrder.id} (order_id: ${foundOrder.order_id}) with shipment ${finalShipmentId}`);
    
    const { data: updatedOrder, error: updateError } = await supabaseClient
      .from('orders')
      .update({ 
        shipment_id: finalShipmentId,
        status: 'shipped'
      })
      .eq('id', foundOrder.id)
      .select('id, order_id, status, shipment_id');
    
    if (!updateError && updatedOrder && updatedOrder.length > 0) {
      console.log(`✅ Successfully linked order ${orderId} to shipment ${finalShipmentId}:`, updatedOrder[0]);
      orderUpdateSuccess = true;
    } else {
      console.error(`❌ Failed to update order ${foundOrder.id}:`, updateError);
    }
  } else {
    console.error(`❌ Order ${orderId} not found in database using any strategy`);
    
    // Log available orders for debugging
    const { data: debugOrders } = await supabaseClient
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
  }
  
  if (!orderUpdateSuccess) {
    console.error(`❌ Failed to link order ${orderId} to shipment ${finalShipmentId} using all strategies`);
  }
  
  return orderUpdateSuccess;
}

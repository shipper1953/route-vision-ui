
export async function linkShipmentToOrder(supabaseClient: any, orderId: string, finalShipmentId: number) {
  console.log(`Linking order ${orderId} to shipment ${finalShipmentId}`);
  
  // First, let's see what orders exist to understand the data structure
  const { data: debugOrders, error: debugError } = await supabaseClient
    .from('orders')
    .select('id, order_id, customer_name, status')
    .limit(10);
  
  if (debugError) {
    console.error('Debug query failed:', debugError);
  } else {
    console.log('Available orders for debugging:', debugOrders);
    console.log(`Looking for order with order_id: "${orderId}"`);
  }
  
  // Try to find the order using a broader search approach
  let orderUpdateSuccess = false;
  let foundOrder = null;
  
  // Strategy 1: Try exact match on order_id field
  console.log(`Strategy 1: Searching for order with exact order_id: "${orderId}"`);
  const { data: orderByOrderId, error: searchError1 } = await supabaseClient
    .from('orders')
    .select('id, order_id, customer_name')
    .eq('order_id', orderId)
    .maybeSingle();
  
  if (!searchError1 && orderByOrderId) {
    foundOrder = orderByOrderId;
    console.log(`✓ Found order by exact order_id match:`, foundOrder);
  } else {
    console.log(`✗ Strategy 1 failed. Error:`, searchError1);
  }
  
  // Strategy 2: If not found and orderId is numeric, try by id field
  if (!foundOrder && !isNaN(Number(orderId))) {
    console.log(`Strategy 2: Searching for order with numeric id: ${orderId}`);
    const { data: orderById, error: searchError2 } = await supabaseClient
      .from('orders')
      .select('id, order_id, customer_name')
      .eq('id', parseInt(orderId, 10))
      .maybeSingle();
    
    if (!searchError2 && orderById) {
      foundOrder = orderById;
      console.log(`✓ Found order by numeric id:`, foundOrder);
    } else {
      console.log(`✗ Strategy 2 failed. Error:`, searchError2);
    }
  }
  
  // Strategy 3: Try case-insensitive search on order_id
  if (!foundOrder) {
    console.log(`Strategy 3: Searching for order with case-insensitive order_id: "${orderId}"`);
    const { data: orderByCaseInsensitive, error: searchError3 } = await supabaseClient
      .from('orders')
      .select('id, order_id, customer_name')
      .ilike('order_id', orderId)
      .maybeSingle();
    
    if (!searchError3 && orderByCaseInsensitive) {
      foundOrder = orderByCaseInsensitive;
      console.log(`✓ Found order by case-insensitive search:`, foundOrder);
    } else {
      console.log(`✗ Strategy 3 failed. Error:`, searchError3);
    }
  }
  
  // Strategy 4: Try searching with wildcards
  if (!foundOrder) {
    console.log(`Strategy 4: Searching for order with wildcards around order_id: "%${orderId}%"`);
    const { data: orderByWildcard, error: searchError4 } = await supabaseClient
      .from('orders')
      .select('id, order_id, customer_name')
      .ilike('order_id', `%${orderId}%`)
      .maybeSingle();
    
    if (!searchError4 && orderByWildcard) {
      foundOrder = orderByWildcard;
      console.log(`✓ Found order by wildcard search:`, foundOrder);
    } else {
      console.log(`✗ Strategy 4 failed. Error:`, searchError4);
    }
  }
  
  // If we found an order, try to update it
  if (foundOrder) {
    console.log(`Attempting to update order ${foundOrder.id} (order_id: ${foundOrder.order_id}) with shipment ${finalShipmentId}`);
    
    const { data: updatedOrder, error: updateError } = await supabaseClient
      .from('orders')
      .update({ 
        shipment_id: finalShipmentId,
        status: 'shipped'
      })
      .eq('id', foundOrder.id)
      .select();
    
    if (!updateError && updatedOrder && updatedOrder.length > 0) {
      console.log(`✓ Successfully linked order ${orderId} to shipment ${finalShipmentId}:`, updatedOrder[0]);
      orderUpdateSuccess = true;
    } else {
      console.error(`✗ Failed to update order ${foundOrder.id}:`, updateError);
    }
  } else {
    console.error(`✗ Order ${orderId} not found in database using any strategy`);
    
    // Log what orders are available for debugging
    console.log('All available orders in database:');
    if (debugOrders) {
      debugOrders.forEach(order => {
        console.log(`  - ID: ${order.id}, order_id: "${order.order_id}", customer: ${order.customer_name}, status: ${order.status}`);
      });
    }
  }
  
  if (!orderUpdateSuccess) {
    console.error(`Failed to link order ${orderId} to shipment ${finalShipmentId} using all strategies`);
  }
  
  return orderUpdateSuccess;
}

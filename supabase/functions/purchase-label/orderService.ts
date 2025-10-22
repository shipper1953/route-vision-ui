export async function linkShipmentToOrder(
  supabaseClient: any, 
  orderId: string, 
  finalShipmentId: number,
  packageMetadata?: {
    packageIndex: number;
    items: Array<any>;
    boxData: { name: string; length: number; width: number; height: number };
    weight: number;
  }
) {
  console.log(`🔗 Linking order ${orderId} to shipment ${finalShipmentId}`);
  if (packageMetadata) {
    console.log(`📦 Package metadata:`, packageMetadata);
  }
  
  let orderUpdateSuccess = false;
  let foundOrder = null;
  
  // Strategy 1: If orderId is numeric, try by id field first (most likely case)
  if (!isNaN(Number(orderId))) {
    console.log(`📝 Strategy 1: Searching for order with numeric id: ${orderId}`);
    const { data: orderById, error: searchError1 } = await supabaseClient
      .from('orders')
      .select('id, order_id, customer_name, status, shipment_id')
      .eq('id', parseInt(orderId, 10))
      .maybeSingle();
    
    if (!searchError1 && orderById) {
      foundOrder = orderById;
      console.log(`✅ Found order by numeric id:`, foundOrder);
    } else {
      console.log(`❌ Strategy 1 failed. Error:`, searchError1);
    }
  }
  
  // Strategy 2: Try exact match on order_id field
  if (!foundOrder) {
    console.log(`📝 Strategy 2: Searching for order with exact order_id: "${orderId}"`);
    const { data: orderByOrderId, error: searchError2 } = await supabaseClient
      .from('orders')
      .select('id, order_id, customer_name, status, shipment_id')
      .eq('order_id', orderId)
      .maybeSingle();
    
    if (!searchError2 && orderByOrderId) {
      foundOrder = orderByOrderId;
      console.log(`✅ Found order by exact order_id match:`, foundOrder);
    } else {
      console.log(`❌ Strategy 2 failed. Error:`, searchError2);
    }
  }
  
  // Strategy 3: Try case-insensitive search on order_id
  if (!foundOrder) {
    console.log(`📝 Strategy 3: Searching for order with case-insensitive order_id: "${orderId}"`);
    const { data: orderByCaseInsensitive, error: searchError3 } = await supabaseClient
      .from('orders')
      .select('id, order_id, customer_name, status, shipment_id')
      .ilike('order_id', orderId)
      .maybeSingle();
    
    if (!searchError3 && orderByCaseInsensitive) {
      foundOrder = orderByCaseInsensitive;
      console.log(`✅ Found order by case-insensitive search:`, foundOrder);
    } else {
      console.log(`❌ Strategy 3 failed. Error:`, searchError3);
    }
  }
  
  // If we found an order, process it
  if (foundOrder) {
    console.log(`🔄 Processing order ${foundOrder.id} (order_id: ${foundOrder.order_id}) with shipment ${finalShipmentId}`);
    
    // Only update orders.shipment_id if it's not already set (first package)
    if (!foundOrder.shipment_id) {
      console.log(`📝 Setting initial shipment_id on order`);
      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({ 
          shipment_id: finalShipmentId
          // Don't set status here - let the trigger handle fulfillment status
        })
        .eq('id', foundOrder.id);
      
      if (updateError) {
        console.error(`❌ Failed to update order:`, updateError);
      } else {
        console.log(`✅ Set shipment_id ${finalShipmentId} on order`);
        orderUpdateSuccess = true;
      }
    } else {
      console.log(`ℹ️ Order already has shipment_id ${foundOrder.shipment_id}, keeping it`);
      orderUpdateSuccess = true;
    }
    
    // ALWAYS create order_shipments record (even for subsequent packages)
    console.log(`🔗 Creating order_shipments link record for package ${packageMetadata?.packageIndex || 0}...`);
    console.log(`📦 Package metadata items:`, packageMetadata?.items);
    
    const { error: linkError } = await supabaseClient
      .from('order_shipments')
      .insert({
        order_id: foundOrder.id,
        shipment_id: finalShipmentId,
        package_index: packageMetadata?.packageIndex || 0,
        package_info: packageMetadata ? {
          boxName: packageMetadata.boxData?.name,
          boxDimensions: packageMetadata.boxData ? {
            length: packageMetadata.boxData.length,
            width: packageMetadata.boxData.width,
            height: packageMetadata.boxData.height
          } : null,
          items: packageMetadata.items || [],
          weight: packageMetadata.weight
        } : null
      });
    
    if (linkError) {
      console.error(`❌ Failed to create order_shipments record:`, linkError);
      orderUpdateSuccess = false;
    } else {
      console.log(`✅ Created order_shipments link record`);
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

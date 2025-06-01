
export async function linkShipmentToOrder(supabaseClient: any, orderId: string, finalShipmentId: number) {
  console.log(`Linking order ${orderId} to shipment ${finalShipmentId}`);
  
  // Try multiple strategies to find and update the order
  let orderUpdateSuccess = false;
  
  // Strategy 1: Try with the orderId as-is if it's a string ID
  if (isNaN(Number(orderId))) {
    const { error: orderUpdateError1 } = await supabaseClient
      .from('orders')
      .update({ 
        shipment_id: finalShipmentId,
        status: 'shipped'
      })
      .eq('order_id', orderId);
    
    if (!orderUpdateError1) {
      console.log(`Successfully linked order ${orderId} to shipment via string order_id`);
      orderUpdateSuccess = true;
    } else {
      console.log('Failed to update via string order_id:', orderUpdateError1);
    }
  }
  
  // Strategy 2: Try with numeric order_id if not successful yet
  if (!orderUpdateSuccess && !isNaN(Number(orderId))) {
    const { error: orderUpdateError2 } = await supabaseClient
      .from('orders')
      .update({ 
        shipment_id: finalShipmentId,
        status: 'shipped'
      })
      .eq('order_id', orderId);
    
    if (!orderUpdateError2) {
      console.log(`Successfully linked order ${orderId} to shipment via numeric order_id`);
      orderUpdateSuccess = true;
    } else {
      console.log('Failed to update via numeric order_id:', orderUpdateError2);
    }
  }
  
  // Strategy 3: Try with id field if numeric
  if (!orderUpdateSuccess && !isNaN(Number(orderId))) {
    const orderIdNumeric = parseInt(orderId, 10);
    const { error: orderUpdateError3 } = await supabaseClient
      .from('orders')
      .update({ 
        shipment_id: finalShipmentId,
        status: 'shipped'
      })
      .eq('id', orderIdNumeric);
    
    if (!orderUpdateError3) {
      console.log(`Successfully linked order ${orderId} to shipment via id field`);
      orderUpdateSuccess = true;
    } else {
      console.log('Failed to update via id field:', orderUpdateError3);
    }
  }
  
  if (!orderUpdateSuccess) {
    console.error(`Failed to link order ${orderId} to shipment using all strategies`);
  }
  
  return orderUpdateSuccess;
}

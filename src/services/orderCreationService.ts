
import { supabase } from "@/integrations/supabase/client";
import { OrderData } from "@/types/orderTypes";

interface CreateOrderInput extends Omit<OrderData, 'id'> {
  warehouseId?: string;
}

export const createOrder = async (orderData: CreateOrderInput): Promise<OrderData> => {
  console.log("Creating order with data:", orderData);
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User must be authenticated to create orders");
  }

  // Get user's profile to get company_id
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('company_id, warehouse_ids')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile?.company_id) {
    throw new Error("User profile not found or not assigned to a company");
  }

  // Use the provided warehouse ID or fall back to user's assigned warehouse or company default
  let finalWarehouseId = orderData.warehouseId;
  
  if (!finalWarehouseId) {
    // Get warehouse from user's warehouse_ids array
    const warehouseIds = Array.isArray(userProfile.warehouse_ids) ? userProfile.warehouse_ids : [];
    finalWarehouseId = warehouseIds.length > 0 ? warehouseIds[0] : null;
  }

  // If still no warehouse, get the default warehouse for the company
  if (!finalWarehouseId) {
    const { data: defaultWarehouse, error: warehouseError } = await supabase
      .from('warehouses')
      .select('id')
      .eq('company_id', userProfile.company_id)
      .eq('is_default', true)
      .single();
    
    if (!warehouseError && defaultWarehouse) {
      finalWarehouseId = defaultWarehouse.id;
      console.log("Using company default warehouse:", finalWarehouseId);
    }
  }

  if (!finalWarehouseId) {
    throw new Error("No warehouse available for this user or company. Please contact your administrator to set up a warehouse.");
  }

  // Generate a unique order ID
  const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

  // Use any type to bypass TypeScript issues with generated types
  const orderRecord: any = {
    order_id: orderId,
    customer_name: orderData.customerName,
    customer_company: orderData.customerCompany || null,
    customer_email: orderData.customerEmail || null,
    customer_phone: orderData.customerPhone || null,
    order_date: orderData.orderDate,
    required_delivery_date: orderData.requiredDeliveryDate,
    status: orderData.status,
    items: [{ count: orderData.items, description: "Items" }],
    value: parseFloat(orderData.value) || 0,
    shipping_address: orderData.shippingAddress,
    user_id: user.id,
    company_id: userProfile.company_id,
    warehouse_id: finalWarehouseId
  };

  console.log("Creating order with warehouse_id:", finalWarehouseId);

  const { data, error } = await supabase
    .from('orders')
    .insert(orderRecord)
    .select()
    .single();

  if (error) {
    console.error("Error creating order:", error);
    throw new Error(`Failed to create order: ${error.message}`);
  }

  console.log("Order created successfully with warehouse:", data.warehouse_id);

  // Convert back to OrderData format with proper type handling
  const shippingAddress = typeof data.shipping_address === 'object' && data.shipping_address !== null
    ? data.shipping_address as any
    : {
        street1: '',
        city: '',
        state: '',
        zip: '',
        country: 'US'
      };

  return {
    id: data.id.toString(),
    customerName: data.customer_name || '',
    customerCompany: data.customer_company || undefined,
    customerEmail: data.customer_email || undefined,
    customerPhone: data.customer_phone || undefined,
    orderDate: data.order_date || '',
    requiredDeliveryDate: data.required_delivery_date || '',
    status: data.status || 'processing',
    items: Array.isArray(data.items) ? data.items.length : 1,
    value: data.value?.toString() || '0',
    shippingAddress: shippingAddress
  };
};

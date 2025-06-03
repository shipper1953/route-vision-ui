
import { supabase } from "@/integrations/supabase/client";
import { OrderData } from "@/types/orderTypes";

export const createOrder = async (orderData: Omit<OrderData, 'id'>): Promise<OrderData> => {
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

  // Get default warehouse ID from user's warehouse_ids array
  const warehouseIds = Array.isArray(userProfile.warehouse_ids) ? userProfile.warehouse_ids : [];
  const defaultWarehouseId = warehouseIds.length > 0 ? warehouseIds[0] : null;

  // Generate order ID
  const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const { data, error } = await supabase
    .from('orders')
    .insert({
      order_id: orderId,
      customer_name: orderData.customerName,
      customer_company: orderData.customerCompany,
      customer_email: orderData.customerEmail,
      customer_phone: orderData.customerPhone,
      order_date: orderData.orderDate,
      required_delivery_date: orderData.requiredDeliveryDate,
      status: orderData.status,
      items: [{ count: orderData.items, description: "Items" }], // Convert number to items array
      value: orderData.value,
      shipping_address: orderData.shippingAddress,
      user_id: user.id,
      company_id: userProfile.company_id,
      warehouse_id: defaultWarehouseId
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating order:", error);
    throw new Error(`Failed to create order: ${error.message}`);
  }

  console.log("Order created successfully:", data);

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

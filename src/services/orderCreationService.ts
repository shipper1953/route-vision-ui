
import { supabase } from "@/integrations/supabase/client";
import { OrderData } from "@/types/orderTypes";

interface OrderItemWithDetails {
  itemId: string;
  quantity: number;
  unitPrice: number;
  name: string;
  sku: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
}

interface CreateOrderInput extends Omit<OrderData, 'id'> {
  warehouseId?: string;
  orderItems?: OrderItemWithDetails[];
}

export const createOrder = async (orderData: CreateOrderInput): Promise<OrderData> => {
  console.log("Creating order with data:", orderData);
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User must be authenticated to create orders");
  }

  // Fetch user profile
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('company_id, warehouse_ids')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile) {
    throw new Error("User profile not found");
  }

  // For super admins without a company, derive company_id from the selected warehouse
  let companyId = userProfile.company_id;
  if (!companyId && orderData.warehouseId) {
    const { data: warehouse } = await supabase
      .from('warehouses')
      .select('company_id')
      .eq('id', orderData.warehouseId)
      .single();
    companyId = warehouse?.company_id || null;
  }

  if (!companyId) {
    throw new Error("Could not determine company. Please select a warehouse.");
  }

  // Determine warehouse ID (use provided, user's first, or company default in parallel)
  let finalWarehouseId: string | null = orderData.warehouseId || null;
  
  if (!finalWarehouseId) {
    const warehouseIds = Array.isArray(userProfile.warehouse_ids) ? userProfile.warehouse_ids : [];
    finalWarehouseId = warehouseIds.length > 0 ? String(warehouseIds[0]) : null;
  }

  // Parallelize warehouse lookup and order ID generation
  const [warehouseResult, orderIdResult] = await Promise.all([
    // Fetch default warehouse only if needed
    !finalWarehouseId
      ? supabase
          .from('warehouses')
          .select('id')
          .eq('company_id', companyId)
          .eq('is_default', true)
          .maybeSingle()
      : Promise.resolve({ data: { id: finalWarehouseId }, error: null }),
    // Generate unique order ID in parallel
    (async () => {
      let orderId: string;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('order_id', orderId)
          .maybeSingle();
        
        if (!existingOrder) return orderId;
        attempts++;
      }
      throw new Error("Failed to generate unique order ID after multiple attempts");
    })()
  ]);

  if (!warehouseResult.error && warehouseResult.data) {
    finalWarehouseId = warehouseResult.data.id;
  }

  if (!finalWarehouseId) {
    throw new Error("No warehouse available for this user or company. Please contact your administrator to set up a warehouse.");
  }

  const orderId = orderIdResult;
  // Prepare items data - include both legacy format and detailed items
  const itemsData = orderData.orderItems && orderData.orderItems.length > 0 
    ? orderData.orderItems.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        name: item.name,
        sku: item.sku,
        dimensions: item.dimensions
      }))
    : [{ count: orderData.items, description: "Items" }];

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
    items: itemsData,
    value: parseFloat(orderData.value) || 0,
    shipping_address: orderData.shippingAddress,
    user_id: user.id,
    company_id: companyId,
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

  // Calculate and store cartonization data for the new order using the canonical
  // server-side packaging-decision logic (same algorithm used in shipment flow).
  if (orderData.orderItems && orderData.orderItems.length > 0 &&
      orderData.orderItems.some(item => item.dimensions)) {
    try {
      const items = orderData.orderItems
        .filter(item => item.dimensions)
        .map(item => ({
          id: item.itemId,
          name: item.name,
          length: Number(item.dimensions!.length),
          width: Number(item.dimensions!.width),
          height: Number(item.dimensions!.height),
          weight: Number(item.dimensions!.weight),
          quantity: Number(item.quantity || 1),
          fragility: 'low',
          category: 'order_item'
        }));

      if (items.length > 0) {
        const { data: decisionData, error: decisionError } = await supabase.functions.invoke(
          'packaging-decision',
          {
            body: {
              order_id: Number(data.id),
              items
            }
          }
        );

        if (decisionError || decisionData?.error) {
          console.error('Canonical cartonization (packaging-decision) failed on order create:', decisionError || decisionData?.error);
        } else if (import.meta.env.DEV) {
          console.log('Canonical cartonization stored via packaging-decision for order:', data.id, decisionData);
        }
      } else {
        console.log('No items with dimensions found for canonical cartonization');
      }
    } catch (cartonizationError) {
      console.error("Error calculating cartonization:", cartonizationError);
      // Don't fail order creation if cartonization fails
    }
  } else {
    console.log("No order items provided for cartonization");
  }

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
    status: data.status || 'ready_to_ship',
    items: Array.isArray(data.items) ? data.items.length : 1,
    value: data.value?.toString() || '0',
    shippingAddress: shippingAddress
  };
};


import { supabase } from "@/integrations/supabase/client";
import { OrderData } from "@/types/orderTypes";
import { convertSupabaseToOrderData } from "./orderDataParser";

export const fetchOrderById = async (orderId: string): Promise<OrderData | null> => {
  try {
    if (import.meta.env.DEV) {
      console.log(`Fetching order by ID: ${orderId}`);
    }
    
    // Convert orderId to number since the database id column is bigint
    const orderIdNumber = parseInt(orderId, 10);
    
    if (isNaN(orderIdNumber)) {
      console.error(`Invalid order ID format: ${orderId}`);
      return null;
    }
    
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id, order_id, customer_name, customer_company, customer_email, customer_phone,
        status, order_date, required_delivery_date, value, items, shipping_address,
        qboid_dimensions, user_id, company_id, warehouse_id, created_at,
        estimated_delivery_date, actual_delivery_date, shipment_id
      `)
      .eq('id', orderIdNumber)
      .maybeSingle();

    if (error) {
      console.error('Error fetching order:', error);
      return null;
    }

    if (!order) {
      if (import.meta.env.DEV) {
        console.log(`Order ${orderId} not found`);
      }
      return null;
    }

    if (import.meta.env.DEV) {
      console.log("Raw order data from database:", order);
    }
    const convertedOrder = convertSupabaseToOrderData(order);
    if (import.meta.env.DEV) {
      console.log("Converted order data:", convertedOrder);
    }
    
    return convertedOrder;

  } catch (error) {
    console.error('Error in fetchOrderById:', error);
    return null;
  }
};

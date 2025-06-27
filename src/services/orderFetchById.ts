
import { supabase } from "@/integrations/supabase/client";
import { OrderData } from "@/types/orderTypes";
import { convertSupabaseToOrderData } from "./orderDataParser";

export const fetchOrderById = async (orderId: string): Promise<OrderData | null> => {
  try {
    console.log(`Fetching order by ID: ${orderId}`);
    
    // Convert orderId to number since the database id column is bigint
    const orderIdNumber = parseInt(orderId, 10);
    
    if (isNaN(orderIdNumber)) {
      console.error(`Invalid order ID format: ${orderId}`);
      return null;
    }
    
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderIdNumber)
      .maybeSingle();

    if (error) {
      console.error('Error fetching order:', error);
      return null;
    }

    if (!order) {
      console.log(`Order ${orderId} not found`);
      return null;
    }

    console.log("Raw order data from database:", order);
    const convertedOrder = convertSupabaseToOrderData(order);
    console.log("Converted order data:", convertedOrder);
    
    return convertedOrder;

  } catch (error) {
    console.error('Error in fetchOrderById:', error);
    return null;
  }
};

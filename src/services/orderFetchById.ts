
import { supabase } from "@/integrations/supabase/client";
import { OrderData } from "@/types/orderTypes";
import { convertSupabaseToOrderData } from "./orderDataParser";

export const fetchOrderById = async (orderId: string): Promise<OrderData | null> => {
  try {
    console.log(`Fetching order by ID: ${orderId}`);
    
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        qboid_dimensions (
          length,
          width,
          height,
          weight,
          order_id
        )
      `)
      .eq('id', orderId)
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

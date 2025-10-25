
import { supabase } from "@/integrations/supabase/client";
import { OrderData } from "@/types/orderTypes";
import { convertSupabaseToOrderData } from "./orderDataParser";
import { hydrateOrdersWithShipments } from "./orderShipmentHydration";

const DEBUG_ENABLED = import.meta.env.VITE_DEBUG_ORDER_PARSER === 'true' || import.meta.env.DEV;

export const fetchOrderById = async (orderId: string): Promise<OrderData | null> => {
  try {
    if (DEBUG_ENABLED) {
      console.log(`Fetching order by ID: ${orderId}`);
    }
    
    // Convert orderId to number since the database id column is bigint
    const orderIdNumber = parseInt(orderId, 10);
    
    if (isNaN(orderIdNumber)) {
      console.error(`Invalid order ID format: ${orderId}`);
      return null;
    }
    
    // Fetch order with narrowed projection
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id, order_id, customer_name, customer_company, customer_email, customer_phone,
        status, order_date, required_delivery_date, value, items, shipping_address,
        qboid_dimensions, user_id, company_id, warehouse_id, created_at,
        estimated_delivery_date, actual_delivery_date, shipment_id,
        items_shipped, items_total, fulfillment_percentage, fulfillment_status
      `)
      .eq('id', orderIdNumber)
      .maybeSingle();

    if (error) {
      console.error('Error fetching order:', error);
      return null;
    }

    if (!order) {
      if (DEBUG_ENABLED) {
        console.log(`Order ${orderId} not found`);
      }
      return null;
    }

    // Hydrate order with shipment data using shared utility
    const [hydratedOrder] = await hydrateOrdersWithShipments([order]);

    // Fetch cartonization data separately
    const { data: cartonizationData } = await supabase
      .from('order_cartonization')
      .select('*')
      .eq('order_id', orderIdNumber)
      .maybeSingle();

    if (DEBUG_ENABLED) {
      console.log("Raw order data from database:", order);
      if (cartonizationData) {
        console.log("Cartonization data found:", cartonizationData);
      }
    }
    
    const convertedOrder = convertSupabaseToOrderData(hydratedOrder);
    
    // Add cartonization data if available
    if (cartonizationData && cartonizationData.recommended_box_data) {
      const boxData = cartonizationData.recommended_box_data as any;
      convertedOrder.recommendedBox = {
        id: cartonizationData.recommended_box_id || '',
        name: boxData.name || '',
        length: Number(boxData.length || 0),
        width: Number(boxData.width || 0),
        height: Number(boxData.height || 0),
        maxWeight: Number(boxData.maxWeight || 0),
        cost: Number(boxData.cost || 0),
        inStock: Number(boxData.inStock || 0),
        type: boxData.type || 'box'
      };
      
      convertedOrder.packageWeight = {
        itemsWeight: Number(cartonizationData.items_weight || 0),
        boxWeight: Number(cartonizationData.box_weight || 0),
        totalWeight: Number(cartonizationData.total_weight || 0)
      };
    }
    
    if (DEBUG_ENABLED) {
      console.log("Converted order data with cartonization:", convertedOrder);
    }
    
    return convertedOrder;

  } catch (error) {
    console.error('Error in fetchOrderById:', error);
    return null;
  }
};

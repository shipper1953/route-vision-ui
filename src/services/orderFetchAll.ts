
import { OrderData } from "@/types/orderTypes";
import { supabase } from "@/integrations/supabase/client";
import { convertSupabaseToOrderData } from "./orderDataParser";

/**
 * Fetches all orders with shipment data
 * @returns An array of order data
 */
export async function fetchOrders(): Promise<OrderData[]> {
  // Simulate API delay for better UX
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log("Fetching orders from Supabase");
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('id', { ascending: false });
    
    if (error) {
      console.error("Error fetching orders from Supabase:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log("No orders found in Supabase");
      return [];
    }
    
    console.log(`Found ${data.length} orders in Supabase`);
    
    // Fetch shipment data for all orders that have shipment_id
    const ordersWithShipments = await Promise.all(
      data.map(async (order) => {
        let shipmentData = null;
        
        // Check for related shipment data
        if (order.shipment_id) {
          const { data: shipment } = await supabase
            .from('shipments')
            .select('*')
            .eq('id', order.shipment_id)
            .single();
          
          if (shipment) {
            console.log("Found related shipment data for order:", order.order_id, shipment);
            shipmentData = shipment;
          }
        }
        
        // Also check for Qboid dimension data
        const { data: qboidData } = await supabase
          .from('qboid_events')
          .select('*')
          .eq('event_type', 'dimensions_received')
          .order('created_at', { ascending: false })
          .limit(5); // Reduced limit for performance
        
        // Find matching Qboid data by order ID in the data payload
        let matchingQboidData = null;
        if (qboidData && qboidData.length > 0) {
          const searchId = order.order_id.startsWith('ORD-') ? order.order_id : `ORD-${order.order_id}`;
          
          for (const event of qboidData) {
            const eventData = event.data as any;
            if (eventData && (eventData.orderId === searchId || eventData.barcode === searchId)) {
              matchingQboidData = eventData;
              break;
            }
          }
        }
        
        // Create enhanced data object with additional properties
        const enhancedData = {
          ...order,
          qboid_dimensions: matchingQboidData ? {
            length: matchingQboidData.dimensions?.length || matchingQboidData.length,
            width: matchingQboidData.dimensions?.width || matchingQboidData.width,
            height: matchingQboidData.dimensions?.height || matchingQboidData.height,
            weight: matchingQboidData.dimensions?.weight || matchingQboidData.weight,
            orderId: matchingQboidData.orderId || matchingQboidData.barcode
          } : order.qboid_dimensions,
          shipment_data: shipmentData ? {
            id: shipmentData.id,
            carrier: shipmentData.carrier,
            service: shipmentData.service,
            trackingNumber: shipmentData.tracking_number || 'Pending',
            trackingUrl: shipmentData.tracking_url || `https://www.trackingmore.com/track/en/${shipmentData.tracking_number}`,
            estimatedDeliveryDate: shipmentData.estimated_delivery_date,
            actualDeliveryDate: shipmentData.actual_delivery_date,
            cost: shipmentData.cost,
            labelUrl: shipmentData.label_url
          } : null
        };
        
        return enhancedData;
      })
    );
    
    // Convert Supabase data to our OrderData format
    const supabaseOrders: OrderData[] = ordersWithShipments.map(order => convertSupabaseToOrderData(order));
    
    return supabaseOrders;
  } catch (err) {
    console.error("Error fetching orders from Supabase:", err);
    return [];
  }
}

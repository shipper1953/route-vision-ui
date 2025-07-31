
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
    console.log("Raw order IDs from DB:", data.map(o => o.id).slice(0, 10)); // Show first 10 IDs
    
    // First, let's see what shipments exist in the database
    const { data: allShipments } = await supabase
      .from('shipments')
      .select('*');
    
    console.log("All shipments in database:", allShipments);
    
    // Fetch shipment data for all orders
    const ordersWithShipments = await Promise.all(
      data.map(async (order) => {
        // Use order.id since order_id_link doesn't exist in the schema
        const orderIdLink = `ORD-${order.order_id || order.id}`;
        console.log(`Processing order ${orderIdLink}, shipment_id: ${order.shipment_id}`);
        
        let shipmentData = null;
        
        // Check for related shipment data by shipment_id first
        if (order.shipment_id) {
          const { data: shipment, error: shipmentError } = await supabase
            .from('shipments')
            .select('*')
            .eq('id', order.shipment_id)
            .maybeSingle();
          
          console.log(`Shipment query for order ${orderIdLink}:`, { shipment, shipmentError });
          
          if (shipment) {
            console.log("Found related shipment data for order:", orderIdLink, shipment);
            shipmentData = shipment;
          }
        }
        
        // If no shipment found by ID, try to find by order ID pattern in EasyPost data
        if (!shipmentData) {
          // Look for shipments that might be related to this order
          const { data: potentialShipments } = await supabase
            .from('shipments')
            .select('*')
            .order('id', { ascending: false })
            .limit(10);
          
          // This is a simple heuristic - in production you'd want a more robust linking mechanism
          if (potentialShipments && potentialShipments.length > 0) {
            // For now, just log that we found shipments but couldn't link them
            console.log(`Found ${potentialShipments.length} shipments but couldn't link to order ${orderIdLink}`);
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
          const searchId = orderIdLink;
          
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
            id: shipmentData.easypost_id || String(shipmentData.id),
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
    
    console.log("=== ORDERS FETCHED FROM SUPABASE ===");
    console.log(`Total orders: ${supabaseOrders.length}`);
    console.log("Order IDs and statuses:", supabaseOrders.map(o => ({ id: o.id, status: o.status })));
    console.log("Ready to ship orders:", supabaseOrders.filter(o => o.status === 'ready_to_ship'));
    
    return supabaseOrders;
  } catch (err) {
    console.error("Error fetching orders from Supabase:", err);
    return [];
  }
}

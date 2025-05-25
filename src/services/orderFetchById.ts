
import { OrderData } from "@/types/orderTypes";
import { supabase } from "@/integrations/supabase/client";
import { convertSupabaseToOrderData } from "./orderDataParser";

/**
 * Fetches an order by its ID
 * @param orderId The ID of the order to fetch
 * @returns The order data or null if not found
 */
export async function fetchOrderById(orderId: string): Promise<OrderData | null> {
  // Simulate API delay for better UX
  await new Promise(resolve => setTimeout(resolve, 800));
  
  try {
    // Remove "ORD-" prefix if present for order_id lookup
    const searchId = orderId.startsWith('ORD-') ? orderId : `ORD-${orderId}`;
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', searchId)
      .single();
    
    if (error || !data) {
      console.log("Order not found in Supabase:", orderId, error);
      return null;
    }
    
    console.log("Raw order data from Supabase:", data);
    
    // Check for related shipment data
    let shipmentData = null;
    if (data.shipment_id) {
      const { data: shipment } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', data.shipment_id)
        .single();
      
      if (shipment) {
        console.log("Found related shipment data:", shipment);
        shipmentData = shipment;
      }
    }
    
    // Also check for Qboid dimension data
    const { data: qboidData } = await supabase
      .from('qboid_events')
      .select('*')
      .eq('event_type', 'dimensions_received')
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Find matching Qboid data by order ID in the data payload
    let matchingQboidData = null;
    if (qboidData && qboidData.length > 0) {
      console.log("Found Qboid events:", qboidData.length);
      
      for (const event of qboidData) {
        const eventData = event.data as any;
        if (eventData && (eventData.orderId === searchId || eventData.barcode === searchId)) {
          console.log("Found matching Qboid data for order:", searchId, eventData);
          matchingQboidData = eventData;
          break;
        }
      }
    }
    
    // Create enhanced data object with additional properties
    const enhancedData = {
      ...data,
      qboid_dimensions: matchingQboidData ? {
        length: matchingQboidData.dimensions?.length || matchingQboidData.length,
        width: matchingQboidData.dimensions?.width || matchingQboidData.width,
        height: matchingQboidData.dimensions?.height || matchingQboidData.height,
        weight: matchingQboidData.dimensions?.weight || matchingQboidData.weight,
        orderId: matchingQboidData.orderId || matchingQboidData.barcode
      } : data.qboid_dimensions,
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
    
    if (matchingQboidData) {
      console.log("Merging Qboid dimensions with order data");
    }
    
    if (shipmentData) {
      console.log("Merging shipment data with order data");
    }
    
    const orderData = convertSupabaseToOrderData(enhancedData);
    console.log("Final parsed order data:", orderData);
    
    return orderData;
  } catch (err) {
    console.error("Error fetching order from Supabase:", err);
    return null;
  }
}

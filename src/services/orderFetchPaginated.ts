import { OrderData } from "@/types/orderTypes";
import { supabase } from "@/integrations/supabase/client";
import { convertSupabaseToOrderData } from "./orderDataParser";

export interface PaginatedOrdersResult {
  orders: OrderData[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Fetches orders with pagination and optimized queries
 */
export async function fetchOrdersPaginated(
  page: number = 1,
  pageSize: number = 10,
  searchTerm?: string
): Promise<PaginatedOrdersResult> {
  console.log(`Fetching paginated orders: page ${page}, size ${pageSize}, search: ${searchTerm}`);
  
  try {
    // Calculate offset
    const offset = (page - 1) * pageSize;
    
    // Build base query with specific column projection
    let query = supabase
      .from('orders')
      .select(`
        id, order_id, customer_name, customer_company, customer_email, customer_phone,
        status, order_date, required_delivery_date, value, items, shipping_address,
        qboid_dimensions, user_id, company_id, warehouse_id, created_at,
        estimated_delivery_date, actual_delivery_date, shipment_id,
        shipments(
          id, easypost_id, carrier, service, status, tracking_number, tracking_url,
          cost, original_cost, label_url, estimated_delivery_date, actual_delivery_date,
          package_dimensions, package_weights, actual_package_sku, actual_package_master_id, package_count
        )
      `, { count: 'exact' });
    
    // Add search filter if provided
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      query = query.or(`id.ilike.%${searchLower}%,customer_name.ilike.%${searchLower}%,order_id.ilike.%${searchLower}%`);
    }
    
    // Add pagination and ordering
    query = query
      .order('id', { ascending: false })
      .range(offset, offset + pageSize - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error("Error fetching paginated orders:", error);
      return {
        orders: [],
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false
      };
    }
    
    if (!data) {
      return {
        orders: [],
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false
      };
    }
    
    console.log(`Found ${data.length} orders on page ${page}, total: ${count}`);
    
    // Batch fetch qboid data for all orders in current page - OPTIMIZED with date filter
    const orderIdLinks = data.map(order => `ORD-${order.order_id || order.id}`);
    
    // Fetch recent qboid events (last 30 days) instead of entire table
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: allQboidData } = await supabase
      .from('qboid_events')
      .select('*')
      .eq('event_type', 'dimensions_received')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });
    
    // Filter to only events matching current page's orders
    const qboidData = allQboidData?.filter(event => {
      const eventData = event.data as any;
      const orderId = eventData?.orderId || eventData?.barcode;
      return orderId && orderIdLinks.includes(orderId);
    });
    
    // Create a map of qboid data by order ID for quick lookup
    const qboidMap = new Map();
    if (qboidData) {
      qboidData.forEach(event => {
        const eventData = event.data as any;
        if (eventData && (eventData.orderId || eventData.barcode)) {
          const orderId = eventData.orderId || eventData.barcode;
          if (!qboidMap.has(orderId)) {
            qboidMap.set(orderId, eventData);
          }
        }
      });
    }
    
    // Process orders with enhanced data
    const processedOrders = data.map(order => {
      const orderIdLink = `ORD-${order.order_id || order.id}`;
      const qboidDimensions = qboidMap.get(orderIdLink);
      
      // Enhanced data object
      const enhancedData = {
        ...order,
        qboid_dimensions: qboidDimensions ? {
          length: qboidDimensions.dimensions?.length || qboidDimensions.length,
          width: qboidDimensions.dimensions?.width || qboidDimensions.width,
          height: qboidDimensions.dimensions?.height || qboidDimensions.height,
          weight: qboidDimensions.dimensions?.weight || qboidDimensions.weight,
          orderId: qboidDimensions.orderId || qboidDimensions.barcode
        } : order.qboid_dimensions,
        shipment_data: order.shipments ? {
          id: order.shipments.easypost_id || String(order.shipments.id),
          carrier: order.shipments.carrier,
          service: order.shipments.service,
          trackingNumber: order.shipments.tracking_number || 'Pending',
          trackingUrl: order.shipments.tracking_url || `https://www.trackingmore.com/track/en/${order.shipments.tracking_number}`,
          estimatedDeliveryDate: order.shipments.estimated_delivery_date,
          actualDeliveryDate: order.shipments.actual_delivery_date,
          cost: order.shipments.cost,
          labelUrl: order.shipments.label_url
        } : null
      };
      
      return convertSupabaseToOrderData(enhancedData);
    });
    
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    
    return {
      orders: processedOrders,
      totalCount,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
    
  } catch (err) {
    console.error("Error fetching paginated orders:", err);
    return {
      orders: [],
      totalCount: 0,
      hasNextPage: false,
      hasPreviousPage: false
    };
  }
}
import { OrderData } from "@/types/orderTypes";
import { supabase } from "@/integrations/supabase/client";
import { convertSupabaseToOrderData } from "./orderDataParser";
import { hydrateOrdersWithShipments } from "./orderShipmentHydration";

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
  searchTerm?: string,
  statusFilter?: string
): Promise<PaginatedOrdersResult> {
  console.log(`Fetching paginated orders: page ${page}, size ${pageSize}, search: ${searchTerm}, status: ${statusFilter}`);
  
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
        estimated_delivery_date, actual_delivery_date, shipment_id
      `, { count: 'exact' });
    
    // Add search filter if provided
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      query = query.or(`id.ilike.%${searchLower}%,customer_name.ilike.%${searchLower}%,order_id.ilike.%${searchLower}%`);
    }
    
    // Add status filter if provided and not "all"
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
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
    
    // Use shared hydration utility with qboid enrichment
    const hydratedOrders = await hydrateOrdersWithShipments(data, true);
    
    // Convert to OrderData format
    const processedOrders = hydratedOrders.map(order => convertSupabaseToOrderData(order));
    
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
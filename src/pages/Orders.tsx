
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { fetchOrders, OrderData } from "@/services/orderService";
import { OrdersHeader } from "@/components/order/OrdersHeader";
import { OrdersSearch } from "@/components/order/OrdersSearch";
import { OrdersTable } from "@/components/order/OrdersTable";

const Orders = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const highlightedOrderId = searchParams.get('highlight');
  
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const orderData = await fetchOrders();
        console.log("Orders loaded from Supabase:", orderData.length);
        setOrders(orderData);
      } catch (error) {
        console.error("Error loading orders:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadOrders();
    
    // Only depend on the specific highlight parameter value, not the entire searchParams object
  }, [highlightedOrderId]);
  
  const filteredOrders = orders.filter(order => {
    const orderId = String(order.id || '').toLowerCase();
    const customerName = String(order.customerName || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return orderId.includes(searchLower) || customerName.includes(searchLower);
  });

  return (
    <TmsLayout>
      <OrdersHeader />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>All Orders</CardTitle>
          <OrdersSearch 
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filteredCount={filteredOrders.length}
            totalCount={orders.length}
            isLoading={loading}
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <LoadingSpinner size={24} />
            </div>
          ) : (
            <OrdersTable 
              orders={filteredOrders}
              loading={loading}
            />
          )}
        </CardContent>
      </Card>
    </TmsLayout>
  );
};

export default Orders;

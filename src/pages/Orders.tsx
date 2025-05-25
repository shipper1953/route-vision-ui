
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { 
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  
  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Required Delivery</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Shipment Details</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <OrdersTable 
                  orders={orders}
                  filteredOrders={filteredOrders}
                  highlightedOrderId={highlightedOrderId}
                  isLoading={loading}
                />
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </TmsLayout>
  );
};

export default Orders;


import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Search, FileDown, Truck, ShoppingBag, CalendarCheck, Calendar, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchOrders, OrderData } from "@/services/orderService";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const OrderStatus = ({ status }: { status: string }) => {
  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'processing':
        return { label: 'Processing', variant: 'outline' };
      case 'ready_to_ship':
        return { label: 'Ready to Ship', variant: 'warning' };
      case 'shipped':
        return { label: 'Shipped', variant: 'default' };
      case 'delivered':
        return { label: 'Delivered', variant: 'success' };
      default:
        return { label: status, variant: 'outline' };
    }
  };

  const { label, variant } = getStatusDetails(status);
  return <Badge variant={variant as any}>{label}</Badge>;
};

const ShipmentInfo = ({ shipment }: { shipment?: OrderData['shipment'] }) => {
  if (!shipment) return null;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Truck size={14} className="text-muted-foreground" />
        <span className="text-sm">{shipment.carrier} {shipment.service}</span>
      </div>
      <div className="flex items-center gap-1">
        <Package size={14} className="text-muted-foreground" />
        <a 
          href={shipment.trackingUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          {shipment.trackingNumber}
          <ExternalLink size={12} />
        </a>
      </div>
      {shipment.estimatedDeliveryDate && (
        <div className="flex items-center gap-1">
          <Calendar size={14} className="text-muted-foreground" />
          <span className="text-sm">Est: {new Date(shipment.estimatedDeliveryDate).toLocaleDateString()}</span>
        </div>
      )}
      {shipment.actualDeliveryDate && (
        <div className="flex items-center gap-1">
          <CalendarCheck size={14} className="text-muted-foreground" />
          <span className="text-sm">Delivered: {new Date(shipment.actualDeliveryDate).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
};

const Orders = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const highlightedOrderId = searchParams.get('highlight');
  const navigate = useNavigate();
  
  useEffect(() => {
    const loadOrders = async () => {
      try {
        const orderData = await fetchOrders();
        setOrders(orderData);
      } catch (error) {
        console.error("Error loading orders:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadOrders();
  }, []);
  
  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateShipmentForOrder = (orderId: string) => {
    // Navigate to create shipment page with the order ID
    navigate(`/create-shipment?orderId=${orderId}`);
  };

  return (
    <TmsLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tms-blue">Orders</h1>
          <p className="text-muted-foreground">Manage your customer orders</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          <Button className="bg-tms-blue hover:bg-tms-blue-400" onClick={() => navigate('/create-order')}>
            <ShoppingBag className="mr-2 h-4 w-4" />
            Create Order
          </Button>
          <Button variant="outline" onClick={() => {}}>
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>All Orders</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <CardDescription>
            {loading ? "Loading orders..." : `Showing ${filteredOrders.length} of ${orders.length} orders`}
          </CardDescription>
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
                {filteredOrders.map((order) => (
                  <TableRow 
                    key={order.id} 
                    className={highlightedOrderId === order.id ? "bg-blue-50" : ""}
                  >
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(order.requiredDeliveryDate).toLocaleDateString()}</TableCell>
                    <TableCell>{order.items}</TableCell>
                    <TableCell>
                      <OrderStatus status={order.status} />
                    </TableCell>
                    <TableCell>
                      <ShipmentInfo shipment={order.shipment} />
                    </TableCell>
                    <TableCell className="text-right">{order.value}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">Details</Button>
                        {order.status === 'ready_to_ship' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleCreateShipmentForOrder(order.id)}
                            className="flex items-center gap-1"
                          >
                            <Truck className="h-3.5 w-3.5" />
                            Ship
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      No orders found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </TmsLayout>
  );
};

export default Orders;


import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { fetchOrderById } from "@/services/orderFetchById";
import { OrderData } from "@/types/orderTypes";
import { ArrowLeft, Edit, Package, MapPin, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrder = async () => {
      if (!id) {
        setError("Order ID is required");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const orderData = await fetchOrderById(id);
        
        if (!orderData) {
          setError("Order not found");
        } else {
          setOrder(orderData);
        }
      } catch (err) {
        console.error("Error loading order:", err);
        setError("Failed to load order details");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'secondary';
      case 'processing':
        return 'default';
      case 'ready_to_ship':
        return 'default';
      case 'shipped':
        return 'default';
      case 'delivered':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <TmsLayout>
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner size={24} />
        </div>
      </TmsLayout>
    );
  }

  if (error || !order) {
    return (
      <TmsLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/orders")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
                <p className="text-muted-foreground">{error || "The requested order could not be found."}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TmsLayout>
    );
  }

  return (
    <TmsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/orders")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Order {order.id}</h1>
              <p className="text-muted-foreground">Order details and information</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(order.status)}>
              {order.status.replace('_', ' ')}
            </Badge>
            <Button onClick={() => navigate(`/orders/${order.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Order
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Customer Name</label>
                <p className="font-medium">{order.customerName}</p>
              </div>
              {order.customerEmail && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p>{order.customerEmail}</p>
                </div>
              )}
              {order.customerCompany && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company</label>
                  <p>{order.customerCompany}</p>
                </div>
              )}
              {order.customerPhone && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p>{order.customerPhone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Order Date</label>
                <p>{format(new Date(order.orderDate), "MMM dd, yyyy")}</p>
              </div>
              {order.requiredDeliveryDate && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Required Delivery Date</label>
                  <p>{format(new Date(order.requiredDeliveryDate), "MMM dd, yyyy")}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Order Value</label>
                <p className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {order.value}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Items</label>
                <p>{Array.isArray(order.items) ? `${order.items.length} items` : typeof order.items === 'number' ? `${order.items} items` : '0 items'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p>{order.shippingAddress.street1}</p>
                  {order.shippingAddress.street2 && <p>{order.shippingAddress.street2}</p>}
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
                  <p>{order.shippingAddress.country}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shipment Information */}
          {order.shipmentData && (
            <Card>
              <CardHeader>
                <CardTitle>Shipment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Carrier</label>
                  <p>{order.shipmentData.carrier}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Service</label>
                  <p>{order.shipmentData.service}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tracking Number</label>
                  <p className="font-mono">{order.shipmentData.trackingNumber}</p>
                </div>
                {order.shipmentData.cost && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Shipping Cost</label>
                    <p>${order.shipmentData.cost}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </TmsLayout>
  );
};

export default OrderDetails;

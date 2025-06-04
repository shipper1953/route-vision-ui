import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { fetchOrderById, OrderData } from "@/services/orderService";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

const EditOrder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      if (!id) {
        toast.error("Invalid order ID");
        navigate("/orders");
        return;
      }

      try {
        setLoading(true);
        const orderData = await fetchOrderById(id);
        if (!orderData) {
          toast.error("Order not found");
          navigate("/orders");
          return;
        }
        
        if (orderData.status !== 'ready_to_ship') {
          toast.error("Only orders with 'ready to ship' status can be edited");
          navigate("/orders");
          return;
        }
        
        setOrder(orderData);
      } catch (error) {
        console.error("Error loading order:", error);
        toast.error("Failed to load order");
        navigate("/orders");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id, navigate]);

  if (loading) {
    return (
      <TmsLayout>
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner size={24} />
        </div>
      </TmsLayout>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/orders")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Button>
          <h1 className="text-2xl font-semibold">Edit Order {order.id}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Order editing functionality will be implemented here.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Customer:</strong> {order.customerName}
                </div>
                <div>
                  <strong>Status:</strong> {order.status}
                </div>
                <div>
                  <strong>Order Date:</strong> {new Date(order.orderDate).toLocaleDateString()}
                </div>
                <div>
                  <strong>Required Delivery:</strong> {new Date(order.requiredDeliveryDate).toLocaleDateString()}
                </div>
                <div>
                  <strong>Items:</strong> {order.items}
                </div>
                <div>
                  <strong>Value:</strong> ${order.value}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TmsLayout>
  );
};

export default EditOrder;

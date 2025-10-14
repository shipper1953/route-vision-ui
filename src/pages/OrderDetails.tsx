
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { fetchOrderById } from "@/services/orderFetchById";
import { OrderData } from "@/types/orderTypes";
import { OrderDetailsHeader } from "@/components/order/OrderDetailsHeader";
import { CustomerInfoCard } from "@/components/order/CustomerInfoCard";
import { OrderInfoCard } from "@/components/order/OrderInfoCard";
import { ShippingAddressCard } from "@/components/order/ShippingAddressCard";
import { ShipmentInfoCard } from "@/components/order/ShipmentInfoCard";
import { OrderShipmentsDetailCard } from "@/components/order/OrderShipmentsDetailCard";
import { OrderNotFoundCard } from "@/components/order/OrderNotFoundCard";

const OrderDetails = () => {
  const { id } = useParams();
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
        <OrderNotFoundCard error={error} />
      </TmsLayout>
    );
  }

  return (
    <TmsLayout>
      <div className="space-y-6">
        <OrderDetailsHeader order={order} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CustomerInfoCard order={order} />
          <OrderInfoCard order={order} />
          <ShippingAddressCard order={order} />
          {(order.status === 'shipped' || order.status === 'delivered') ? (
            <OrderShipmentsDetailCard order={order} />
          ) : (
            <ShipmentInfoCard order={order} />
          )}
        </div>
      </div>
    </TmsLayout>
  );
};

export default OrderDetails;

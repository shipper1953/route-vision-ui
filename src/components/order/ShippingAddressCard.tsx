
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { OrderData } from "@/types/orderTypes";

interface ShippingAddressCardProps {
  order: OrderData;
}

export const ShippingAddressCard = ({ order }: ShippingAddressCardProps) => {
  if (!order.shippingAddress) return null;

  return (
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
  );
};

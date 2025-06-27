
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { OrderData } from "@/types/orderTypes";

interface OrderInfoCardProps {
  order: OrderData;
}

export const OrderInfoCard = ({ order }: OrderInfoCardProps) => {
  return (
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
  );
};

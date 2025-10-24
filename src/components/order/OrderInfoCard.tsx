
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, Package } from "lucide-react";
import { format } from "date-fns";
import { OrderData } from "@/types/orderTypes";
import { Badge } from "@/components/ui/badge";

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
        {order.orderId && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Shopify Order Number</label>
            <p className="font-mono">{order.orderId}</p>
          </div>
        )}
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
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
            <Package className="h-4 w-4" />
            Items ({Array.isArray(order.items) ? order.items.length : 0})
          </label>
          {Array.isArray(order.items) && order.items.length > 0 ? (
            <div className="space-y-2">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-start p-2 bg-muted/50 rounded-md">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name || item.description || `Item ${index + 1}`}</p>
                    {item.sku && (
                      <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <Badge variant="secondary" className="text-xs">
                      Qty: {item.quantity || 1}
                    </Badge>
                    {item.unitPrice && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ${typeof item.unitPrice === 'number' ? item.unitPrice.toFixed(2) : item.unitPrice}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No items</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

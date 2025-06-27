
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";
import { OrderData } from "@/types/orderTypes";

interface CustomerInfoCardProps {
  order: OrderData;
}

export const CustomerInfoCard = ({ order }: CustomerInfoCardProps) => {
  return (
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
  );
};

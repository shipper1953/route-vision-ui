import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

interface PackageDetailsProps {
  orderInfo: {
    order_number: string;
    order_date: string;
    items: Array<{
      name: string;
      sku: string;
      quantity: number;
    }>;
  };
}

export const PackageDetails = ({ orderInfo }: PackageDetailsProps) => {
  if (!orderInfo || !orderInfo.items || orderInfo.items.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Package Contents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between text-sm pb-4 border-b">
            <div>
              <p className="text-muted-foreground">Order Number</p>
              <p className="font-mono">{orderInfo.order_number}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Order Date</p>
              <p>
                {new Date(orderInfo.order_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            {orderInfo.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">{item.name}</p>
                  {item.sku && (
                    <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Qty: {item.quantity}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

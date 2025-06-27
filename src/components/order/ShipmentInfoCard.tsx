
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderData } from "@/types/orderTypes";

interface ShipmentInfoCardProps {
  order: OrderData;
}

export const ShipmentInfoCard = ({ order }: ShipmentInfoCardProps) => {
  if (!order.shipment) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipment Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Carrier</label>
          <p>{order.shipment.carrier}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Service</label>
          <p>{order.shipment.service}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Tracking Number</label>
          <p className="font-mono">{order.shipment.trackingNumber}</p>
        </div>
        {order.shipment.cost && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Shipping Cost</label>
            <p>${order.shipment.cost}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

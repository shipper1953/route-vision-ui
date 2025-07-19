
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Eye, Package, Truck, Box, ExternalLink, Copy } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { OrderData } from "@/types/orderTypes";
import { useCartonization } from "@/hooks/useCartonization";
import { CartonizationEngine } from "@/services/cartonization/cartonizationEngine";
import { renderOrderItems } from "../helpers/orderItemsHelper";
import { getStatusBadgeVariant } from "../helpers/statusHelper";

interface OrderTableRowProps {
  order: OrderData;
}

export const OrderTableRow = ({ order }: OrderTableRowProps) => {
  const navigate = useNavigate();
  const { boxes, createItemsFromOrderData } = useCartonization();

  const getRecommendedBoxAndWeight = (order: OrderData) => {
    if (order.status !== 'ready_to_ship') return { box: null, weight: null };
    
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      const items = createItemsFromOrderData(order.items, []);
      
      if (items.length > 0) {
        const engine = new CartonizationEngine(boxes);
        const result = engine.calculateOptimalBox(items);
        
        if (result && result.recommendedBox) {
          // Calculate total weight including items and box
          const itemsWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
          const boxWeight = result.recommendedBox.cost * 0.1; // Estimate box weight (0.1 lbs per $1 of cost)
          const totalWeight = itemsWeight + boxWeight;
          
          return {
            box: result.recommendedBox,
            weight: {
              itemsWeight,
              boxWeight,
              totalWeight
            }
          };
        }
      }
    }
    
    return { box: null, weight: null };
  };

  const getShippingInfo = (order: OrderData) => {
    // First check if order has shipment info in the shipment field
    if (order.shipment) {
      return order.shipment;
    }
    
    // Check if order has shipping data in shipping_address field (where bulk shipping stores it)
    const shippingAddress = order.shippingAddress as any;
    if (shippingAddress && typeof shippingAddress === 'object') {
      const hasShippingInfo = shippingAddress.carrier || shippingAddress.trackingNumber;
      if (hasShippingInfo) {
        return {
          id: shippingAddress.easypostShipmentId || '',
          carrier: shippingAddress.carrier,
          service: shippingAddress.service,
          trackingNumber: shippingAddress.trackingNumber,
          trackingUrl: shippingAddress.trackingUrl,
          estimatedDeliveryDate: shippingAddress.estimatedDeliveryDate,
          actualDeliveryDate: shippingAddress.actualDeliveryDate,
          cost: shippingAddress.cost,
          labelUrl: shippingAddress.labelUrl
        };
      }
    }
    
    return null;
  };

  const { box: recommendedBox, weight: packageWeight } = getRecommendedBoxAndWeight(order);
  const shippingInfo = getShippingInfo(order);

  const handleCopyOrder = () => {
    const orderData = encodeURIComponent(JSON.stringify({
      customerName: order.customerName,
      customerCompany: order.customerCompany,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      items: order.items
    }));
    navigate(`/orders/create?copy=${orderData}`);
  };

  return (
    <TableRow key={order.id}>
      <TableCell className="font-medium">{order.id}</TableCell>
      <TableCell>
        <div>
          <div className="font-medium">{order.customerName}</div>
          {order.customerEmail && (
            <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
          )}
        </div>
      </TableCell>
      <TableCell>{format(new Date(order.orderDate), "MMM dd, yyyy")}</TableCell>
      <TableCell>{renderOrderItems(order.items)}</TableCell>
      <TableCell>{order.value}</TableCell>
      <TableCell>
        <Badge variant={getStatusBadgeVariant(order.status)}>
          {order.status.replace('_', ' ')}
        </Badge>
      </TableCell>
      <TableCell>
        {shippingInfo?.estimatedDeliveryDate 
          ? format(new Date(shippingInfo.estimatedDeliveryDate), "MMM dd, yyyy")
          : "-"
        }
      </TableCell>
      <TableCell>
        {shippingInfo?.actualDeliveryDate 
          ? format(new Date(shippingInfo.actualDeliveryDate), "MMM dd, yyyy")
          : "-"
        }
      </TableCell>
      <TableCell>
        {(order.status === 'shipped' || order.status === 'delivered') && shippingInfo ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{shippingInfo.carrier} {shippingInfo.service}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              {shippingInfo.trackingUrl ? (
                <a 
                  href={shippingInfo.trackingUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  {shippingInfo.trackingNumber}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-sm font-mono">{shippingInfo.trackingNumber}</span>
              )}
            </div>
          </div>
        ) : recommendedBox ? (
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 text-tms-blue" />
            <div className="text-sm">
              <div className="font-medium">{recommendedBox.name}</div>
              <div className="text-muted-foreground">
                {recommendedBox.length}" × {recommendedBox.width}" × {recommendedBox.height}"
              </div>
              {packageWeight && (
                <div className="text-xs text-muted-foreground">
                  Weight: {packageWeight.totalWeight.toFixed(1)} lbs
                </div>
              )}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/orders/${order.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/orders/${order.id}/edit`)}
          >
            <Package className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyOrder}
            title="Copy Order"
          >
            <Copy className="h-4 w-4" />
          </Button>
          {order.status !== 'shipped' && order.status !== 'delivered' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/shipments/create?orderId=${order.id}`)}
            >
              <Truck className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

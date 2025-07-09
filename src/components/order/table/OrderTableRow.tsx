
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Eye, Package, Truck, Box } from "lucide-react";
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

  const { box: recommendedBox, weight: packageWeight } = getRecommendedBoxAndWeight(order);

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
        {recommendedBox ? (
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
          {order.status !== 'shipped' && order.status !== 'delivered' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/shipments/create', { 
                state: { orderId: order.id } 
              })}
            >
              <Truck className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

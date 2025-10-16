
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, Package, Truck, Box, ExternalLink, Copy, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { OrderData } from "@/types/orderTypes";
import { supabase } from "@/integrations/supabase/client";
import { renderOrderItems } from "../helpers/orderItemsHelper";
import { getStatusBadgeVariant } from "../helpers/statusHelper";
import { recalculateOrderCartonization } from "@/utils/recalculateOrderCartonization";
import { toast } from "sonner";

interface CartonizationData {
  recommendedBox: any;
  utilization: number;
  confidence: number;
  totalWeight: number;
  itemsWeight: number;
  boxWeight: number;
}

interface ShipmentInfo {
  id: string;
  carrier: string;
  service: string;
  trackingNumber: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  cost?: number | string;
  labelUrl?: string;
  packageIndex?: number;
}

interface OrderTableRowProps {
  order: OrderData;
}

export const OrderTableRow = ({ order }: OrderTableRowProps) => {
  const navigate = useNavigate();
  const [cartonizationData, setCartonizationData] = useState<CartonizationData | null>(null);
  const [allShipments, setAllShipments] = useState<ShipmentInfo[]>([]);
  const [isShipmentsExpanded, setIsShipmentsExpanded] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Fetch cartonization data for this order
  useEffect(() => {
    const fetchCartonizationData = async () => {
      try {
        const { data, error } = await supabase
          .from('order_cartonization')
          .select('*')
          .eq('order_id', typeof order.id === 'string' ? parseInt(order.id) : order.id)
          .single();

        if (!error && data) {
          setCartonizationData({
            recommendedBox: data.recommended_box_data,
            utilization: data.utilization || 0,
            confidence: data.confidence || 0,
            totalWeight: data.total_weight || 0,
            itemsWeight: data.items_weight || 0,
            boxWeight: data.box_weight || 0
          });
        }
      } catch (error) {
        console.error('Error fetching cartonization data:', error);
      }
    };

    // Only fetch for non-shipped orders
    if (order.status !== 'shipped' && order.status !== 'delivered') {
      fetchCartonizationData();
    }
  }, [order.id, order.status]);

  // Fetch all shipments for this order
  useEffect(() => {
    const fetchAllShipments = async () => {
      try {
        // First try to get from order_shipments table (for multi-package orders)
        const { data: orderShipments, error: osError } = await supabase
          .from('order_shipments')
          .select(`
            package_index,
            package_info,
            shipment_id,
            shipments (
              id,
              easypost_id,
              carrier,
              service,
              tracking_number,
              tracking_url,
              estimated_delivery_date,
              actual_delivery_date,
              cost,
              label_url,
              status
            )
          `)
          .eq('order_id', typeof order.id === 'string' ? parseInt(order.id) : order.id)
          .order('package_index');

        if (!osError && orderShipments?.length > 0) {
          const shipmentInfos: ShipmentInfo[] = orderShipments.map((os) => ({
            id: (os.shipments as any)?.easypost_id || (os.shipments as any)?.id?.toString() || '',
            carrier: (os.shipments as any)?.carrier || 'Unknown',
            service: (os.shipments as any)?.service || 'Unknown',
            trackingNumber: (os.shipments as any)?.tracking_number || 'N/A',
            trackingUrl: (os.shipments as any)?.tracking_url || '',
            estimatedDeliveryDate: (os.shipments as any)?.estimated_delivery_date || '',
            actualDeliveryDate: (os.shipments as any)?.actual_delivery_date || '',
            cost: (os.shipments as any)?.cost || 0,
            labelUrl: (os.shipments as any)?.label_url || '',
            packageIndex: os.package_index || 0
          }));
          setAllShipments(shipmentInfos);
          return;
        }

        // Fallback: get direct shipment from orders table
        if (order.shipment) {
          setAllShipments([{
            id: order.shipment.id || '',
            carrier: order.shipment.carrier || 'Unknown',
            service: order.shipment.service || 'Unknown',
            trackingNumber: order.shipment.trackingNumber || 'N/A',
            trackingUrl: order.shipment.trackingUrl || '',
            estimatedDeliveryDate: order.shipment.estimatedDeliveryDate || '',
            actualDeliveryDate: order.shipment.actualDeliveryDate || '',
            cost: order.shipment.cost || 0,
            labelUrl: order.shipment.labelUrl || '',
            packageIndex: 0
          }]);
          return;
        }

        // Final fallback: check shipping address field for bulk shipping data
        const shippingAddress = order.shippingAddress as any;
        if (shippingAddress && typeof shippingAddress === 'object') {
          const hasShippingInfo = shippingAddress.carrier || shippingAddress.trackingNumber;
          if (hasShippingInfo) {
            setAllShipments([{
              id: shippingAddress.easypostShipmentId || '',
              carrier: shippingAddress.carrier || 'Unknown',
              service: shippingAddress.service || 'Unknown',
              trackingNumber: shippingAddress.trackingNumber || 'N/A',
              trackingUrl: shippingAddress.trackingUrl || '',
              estimatedDeliveryDate: shippingAddress.estimatedDeliveryDate || '',
              actualDeliveryDate: shippingAddress.actualDeliveryDate || '',
              cost: shippingAddress.cost || 0,
              labelUrl: shippingAddress.labelUrl || '',
              packageIndex: 0
            }]);
          }
        }
      } catch (error) {
        console.error('Error fetching shipments for order:', order.id, error);
      }
    };

    // Only fetch shipments for shipped/delivered orders
    if (order.status === 'shipped' || order.status === 'delivered') {
      fetchAllShipments();
    }
  }, [order.id, order.status, order.shipment, order.shippingAddress]);

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

  const handleRecalculateBox = async () => {
    setIsRecalculating(true);
    try {
      const orderId = typeof order.id === 'string' ? parseInt(order.id) : order.id;
      const result = await recalculateOrderCartonization(orderId);
      
      if (result.success) {
        toast.success(`Box recalculated: ${result.boxName}`);
        // Refresh cartonization data
        const { data, error } = await supabase
          .from('order_cartonization')
          .select('*')
          .eq('order_id', orderId)
          .single();
        
        if (!error && data) {
          setCartonizationData({
            recommendedBox: data.recommended_box_data,
            utilization: data.utilization || 0,
            confidence: data.confidence || 0,
            totalWeight: data.total_weight || 0,
            itemsWeight: data.items_weight || 0,
            boxWeight: data.box_weight || 0
          });
        }
      } else {
        toast.error(`Failed to recalculate: ${result.error}`);
      }
    } catch (error) {
      console.error('Error recalculating box:', error);
      toast.error('Failed to recalculate box');
    } finally {
      setIsRecalculating(false);
    }
  };

  // Get the earliest estimated delivery date from all shipments
  const getEarliestEstimatedDelivery = () => {
    if (!allShipments.length) return null;
    const dates = allShipments
      .map(s => s.estimatedDeliveryDate)
      .filter(Boolean)
      .map(d => new Date(d));
    return dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
  };

  // Get the latest actual delivery date from all shipments
  const getLatestActualDelivery = () => {
    if (!allShipments.length) return null;
    const dates = allShipments
      .map(s => s.actualDeliveryDate)
      .filter(Boolean)
      .map(d => new Date(d));
    return dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
  };

  const earliestEstimatedDelivery = getEarliestEstimatedDelivery();
  const latestActualDelivery = getLatestActualDelivery();

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
        {earliestEstimatedDelivery 
          ? format(earliestEstimatedDelivery, "MMM dd, yyyy")
          : "-"
        }
      </TableCell>
      <TableCell>
        {latestActualDelivery 
          ? format(latestActualDelivery, "MMM dd, yyyy")
          : "-"
        }
      </TableCell>
      <TableCell>
        {(order.status === 'shipped' || order.status === 'delivered') && allShipments.length > 0 ? (
          <div className="space-y-2 max-w-xs">
            {allShipments.length > 1 ? (
              <div>
                <button
                  onClick={() => setIsShipmentsExpanded(!isShipmentsExpanded)}
                  aria-expanded={isShipmentsExpanded}
                  aria-label={`${isShipmentsExpanded ? 'Collapse' : 'Expand'} shipment details for ${allShipments.length} packages`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-accent transition-colors border border-border text-sm font-medium text-primary"
                >
                  <span>Multiple</span>
                  {isShipmentsExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                
                {isShipmentsExpanded && (
                  <div className="mt-2 space-y-2">
                    {allShipments.map((shipment, index) => (
                      <div key={`${shipment.id}-${index}`} className="space-y-1 border-b border-border pb-2 last:border-b-0 last:pb-0">
                        <div className="text-xs font-medium text-muted-foreground">
                          Package {shipment.packageIndex !== undefined ? shipment.packageIndex + 1 : index + 1}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{shipment.carrier} {shipment.service}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          {shipment.trackingUrl ? (
                            <a 
                              href={shipment.trackingUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              {shipment.trackingNumber}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-sm font-mono">{shipment.trackingNumber}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{allShipments[0].carrier} {allShipments[0].service}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  {allShipments[0].trackingUrl ? (
                    <a 
                      href={allShipments[0].trackingUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      {allShipments[0].trackingNumber}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-sm font-mono">{allShipments[0].trackingNumber}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : cartonizationData?.recommendedBox ? (
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 text-primary" />
            <div className="text-sm">
              <div className="font-medium">{cartonizationData.recommendedBox.name}</div>
              <div className="text-muted-foreground">
                {cartonizationData.recommendedBox.length}" × {cartonizationData.recommendedBox.width}" × {cartonizationData.recommendedBox.height}"
              </div>
              <div className="text-xs text-muted-foreground">
                Weight: {cartonizationData.totalWeight.toFixed(1)} lbs
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">No box</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRecalculateBox}
              disabled={isRecalculating}
              className="h-7 px-2"
            >
              <RefreshCw className={`h-3 w-3 ${isRecalculating ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )}
      </TableCell>
      <TableCell>
        <TooltipProvider>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View order details</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/orders/${order.id}/edit`)}
                >
                  <Package className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit order</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyOrder}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy order to create new</p>
              </TooltipContent>
            </Tooltip>

            {order.status !== 'shipped' && order.status !== 'delivered' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/shipments/create?orderId=${order.id}`)}
                  >
                    <Truck className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create shipment for this order</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  );
};

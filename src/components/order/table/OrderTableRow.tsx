
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, Package, Truck, Box, ExternalLink, Copy, ChevronDown, ChevronUp, RefreshCw, Boxes } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { OrderData } from "@/types/orderTypes";
import { supabase } from "@/integrations/supabase/client";
import { renderOrderItems } from "../helpers/orderItemsHelper";
import { getStatusBadgeVariant } from "../helpers/statusHelper";
import { recalculateOrderCartonization } from "@/utils/recalculateOrderCartonization";
import { toast } from "sonner";
import { FulfillmentBadge } from "../FulfillmentBadge";

interface CartonizationData {
  recommendedBox: any;
  utilization: number;
  confidence: number;
  totalWeight: number;
  itemsWeight: number;
  boxWeight: number;
  totalPackages: number;
  packages: any[];
}

interface ShipmentInfo {
  id: string;
  carrier: string;
  service: string;
  trackingNumber: string;
  status?: string;
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
  const [hasAutoRecalculated, setHasAutoRecalculated] = useState(false);

  // Fetch cartonization data for this order
  useEffect(() => {
    const fetchCartonizationData = async () => {
      try {
        const { data, error } = await supabase
          .from('order_cartonization')
          .select('*')
          .eq('order_id', typeof order.id === 'string' ? parseInt(order.id) : order.id)
          .maybeSingle();

        if (!error && data) {
          setCartonizationData({
            recommendedBox: data.recommended_box_data,
            utilization: data.utilization || 0,
            confidence: data.confidence || 0,
            totalWeight: data.total_weight || 0,
            itemsWeight: data.items_weight || 0,
            boxWeight: data.box_weight || 0
          });
          return;
        }

        if (!data && !hasAutoRecalculated) {
          const orderId = typeof order.id === 'string' ? parseInt(order.id) : order.id;
          const recalcResult = await recalculateOrderCartonization(orderId);
          setHasAutoRecalculated(true);

          if (recalcResult.success) {
            const { data: refreshedData, error: refreshError } = await supabase
              .from('order_cartonization')
              .select('*')
              .eq('order_id', orderId)
              .maybeSingle();

            if (!refreshError && refreshedData) {
              setCartonizationData({
                recommendedBox: refreshedData.recommended_box_data,
                utilization: refreshedData.utilization || 0,
                confidence: refreshedData.confidence || 0,
                totalWeight: refreshedData.total_weight || 0,
                itemsWeight: refreshedData.items_weight || 0,
                boxWeight: refreshedData.box_weight || 0
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching cartonization data:', error);
      }
    };

    // Only fetch for non-shipped orders
    if (order.status !== 'shipped' && order.status !== 'delivered') {
      fetchCartonizationData();
    }
  }, [order.id, order.status, hasAutoRecalculated]);

  // Fetch all shipments for this order
  useEffect(() => {
    const fetchAllShipments = async () => {
      try {
        const getShipmentRecord = (shipmentData: any) => {
          if (Array.isArray(shipmentData)) {
            return shipmentData[0] || null;
          }
          return shipmentData || null;
        };

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
            id: getShipmentRecord(os.shipments)?.easypost_id || getShipmentRecord(os.shipments)?.id?.toString() || '',
            carrier: getShipmentRecord(os.shipments)?.carrier || 'Unknown',
            service: getShipmentRecord(os.shipments)?.service || 'Unknown',
            status: getShipmentRecord(os.shipments)?.status || undefined,
            trackingNumber: getShipmentRecord(os.shipments)?.tracking_number || 'N/A',
            trackingUrl: getShipmentRecord(os.shipments)?.tracking_url || '',
            estimatedDeliveryDate: getShipmentRecord(os.shipments)?.estimated_delivery_date || '',
            actualDeliveryDate: getShipmentRecord(os.shipments)?.actual_delivery_date || '',
            cost: getShipmentRecord(os.shipments)?.cost || 0,
            labelUrl: getShipmentRecord(os.shipments)?.label_url || '',
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
            status: undefined,
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
              status: shippingAddress.status || undefined,
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

    // Only fetch shipments for shipped/delivered/partially shipped orders
    if (order.status === 'shipped' || order.status === 'delivered' || order.status === 'partially_shipped') {
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
  const hasDeliveredShipment = allShipments.some(
    (shipment) =>
      shipment.actualDeliveryDate ||
      shipment.status?.toLowerCase() === 'delivered'
  );
  const effectiveStatus = hasDeliveredShipment ? 'delivered' : order.status;
  const displayStatus = effectiveStatus.replace(/_/g, ' ');
  const displayShopifyOrderNumber = order.shopifyOrderNumber || order.orderId || '-';

  return (
    <TableRow key={order.id}>
      <TableCell className="font-medium">{order.id}</TableCell>
      <TableCell>
        {order.shopifyOrderUrl ? (
          <a
            href={order.shopifyOrderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            {displayShopifyOrderNumber}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span>{displayShopifyOrderNumber}</span>
        )}
      </TableCell>
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
        <div className="flex flex-col gap-1">
          <Badge variant={getStatusBadgeVariant(effectiveStatus)}>
            {displayStatus}
          </Badge>
          {(order.fulfillment_status === 'partially_fulfilled' || order.status === 'partially_shipped' ||
            (order.items_total && order.items_shipped !== undefined && order.items_shipped < order.items_total)) && (
            <FulfillmentBadge
              itemsShipped={order.items_shipped || 0}
              itemsTotal={order.items_total || 0}
              fulfillmentPercentage={order.fulfillment_percentage || 0}
              status={order.fulfillment_status || 'unfulfilled'}
            />
          )}
        </div>
      </TableCell>
      <TableCell>
        {earliestEstimatedDelivery 
          ? format(earliestEstimatedDelivery, "MMM dd, yyyy")
          : order.estimatedDeliveryDate
            ? format(new Date(order.estimatedDeliveryDate), "MMM dd, yyyy")
          : "-"
        }
      </TableCell>
      <TableCell>
        {latestActualDelivery 
          ? format(latestActualDelivery, "MMM dd, yyyy")
          : order.actualDeliveryDate
            ? format(new Date(order.actualDeliveryDate), "MMM dd, yyyy")
          : "-"
        }
      </TableCell>
      <TableCell>
        {(order.status === 'shipped' || order.status === 'delivered' || order.status === 'partially_shipped') && allShipments.length > 0 ? (
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

            {effectiveStatus !== 'shipped' && 
             effectiveStatus !== 'delivered' && 
             effectiveStatus !== 'partially_shipped' && (
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
            )}

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

            {effectiveStatus !== 'shipped' && effectiveStatus !== 'delivered' && effectiveStatus !== 'partially_shipped' && (
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

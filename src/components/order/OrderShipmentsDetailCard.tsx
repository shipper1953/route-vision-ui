import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderData, OrderItem } from "@/types/orderTypes";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Truck, ExternalLink, ChevronRight, ChevronDown, DollarSign, Calendar, Box } from "lucide-react";
import { format } from "date-fns";

interface ShipmentDetail {
  id: string;
  packageIndex: number;
  carrier: string;
  service: string;
  trackingNumber: string;
  trackingUrl: string;
  boxName: string;
  boxDimensions: { length: number; width: number; height: number };
  cost: number;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  items: OrderItem[];
  weight?: number;
}

interface OrderShipmentsDetailCardProps {
  order: OrderData;
}

export const OrderShipmentsDetailCard = ({ order }: OrderShipmentsDetailCardProps) => {
  const [shipments, setShipments] = useState<ShipmentDetail[]>([]);
  const [expandedShipments, setExpandedShipments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShipmentDetails = async () => {
      try {
        setLoading(true);

        // Fetch from order_shipments table with joined shipment data
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
              actual_package_master_id,
              package_dimensions,
              total_weight
            )
          `)
          .eq('order_id', typeof order.id === 'string' ? parseInt(order.id) : order.id)
          .order('package_index');

        if (!osError && orderShipments?.length > 0) {
          // Fetch box details for each shipment
          const boxIds = orderShipments
            .map(os => (os.shipments as any)?.actual_package_master_id)
            .filter(Boolean);
          
          let boxesMap = new Map();
          if (boxIds.length > 0) {
            const { data: boxes } = await supabase
              .from('boxes')
              .select('id, name, length, width, height')
              .in('id', boxIds);
            
            if (boxes) {
              boxes.forEach(box => boxesMap.set(box.id, box));
            }
          }

          const shipmentDetails: ShipmentDetail[] = orderShipments.map((os) => {
            const shipment = os.shipments as any;
            const boxId = shipment?.actual_package_master_id;
            const box = boxesMap.get(boxId);
            const packageDimensions = shipment?.package_dimensions?.[0] || {};

            // Extract items from package_info
            let items: OrderItem[] = [];
            if (os.package_info && typeof os.package_info === 'object') {
              const pkgInfo = os.package_info as any;
              if (pkgInfo.items && Array.isArray(pkgInfo.items)) {
                items = pkgInfo.items;
              }
            }

            return {
              id: shipment?.easypost_id || shipment?.id?.toString() || '',
              packageIndex: os.package_index || 0,
              carrier: shipment?.carrier || 'Unknown',
              service: shipment?.service || 'Unknown',
              trackingNumber: shipment?.tracking_number || 'N/A',
              trackingUrl: shipment?.tracking_url || '',
              boxName: box?.name || packageDimensions.boxName || 'Unknown Box',
              boxDimensions: {
                length: box?.length || packageDimensions.length || 0,
                width: box?.width || packageDimensions.width || 0,
                height: box?.height || packageDimensions.height || 0
              },
              cost: shipment?.cost || 0,
              estimatedDeliveryDate: shipment?.estimated_delivery_date,
              actualDeliveryDate: shipment?.actual_delivery_date,
              items: items,
              weight: shipment?.total_weight
            };
          });

          setShipments(shipmentDetails);
        } else {
          // Fallback to order.shipment if available
          if (order.shipment) {
            setShipments([{
              id: order.shipment.id || '',
              packageIndex: 0,
              carrier: order.shipment.carrier || 'Unknown',
              service: order.shipment.service || 'Unknown',
              trackingNumber: order.shipment.trackingNumber || 'N/A',
              trackingUrl: order.shipment.trackingUrl || '',
              boxName: 'Unknown Box',
              boxDimensions: { length: 0, width: 0, height: 0 },
              cost: typeof order.shipment.cost === 'number' ? order.shipment.cost : parseFloat(order.shipment.cost as string) || 0,
              estimatedDeliveryDate: order.shipment.estimatedDeliveryDate,
              actualDeliveryDate: order.shipment.actualDeliveryDate,
              items: Array.isArray(order.items) ? order.items : []
            }]);
          }
        }
      } catch (error) {
        console.error('Error fetching shipment details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShipmentDetails();
  }, [order.id, order.shipment, order.items]);

  const toggleExpanded = (shipmentId: string) => {
    setExpandedShipments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shipmentId)) {
        newSet.delete(shipmentId);
      } else {
        newSet.add(shipmentId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shipment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading shipment details...</p>
        </CardContent>
      </Card>
    );
  }

  if (shipments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Shipment Details ({shipments.length} package{shipments.length !== 1 ? 's' : ''})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {shipments.map((shipment) => (
          <div key={`${shipment.id}-${shipment.packageIndex}`} className="border rounded-lg p-4 space-y-3">
            {/* Package header */}
            {shipments.length > 1 && (
              <div className="font-semibold text-primary mb-2">
                Package {shipment.packageIndex + 1}
              </div>
            )}
            
            {/* Tracking info with link */}
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Tracking:</span>
              {shipment.trackingUrl ? (
                <a 
                  href={shipment.trackingUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1 font-mono"
                >
                  {shipment.trackingNumber}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="font-mono">{shipment.trackingNumber}</span>
              )}
            </div>
            
            {/* Box info */}
            {shipment.boxName !== 'Unknown Box' && (
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Box:</span>
                <span className="font-medium">{shipment.boxName}</span>
                {shipment.boxDimensions.length > 0 && (
                  <span className="text-muted-foreground text-sm">
                    ({shipment.boxDimensions.length}" × {shipment.boxDimensions.width}" × {shipment.boxDimensions.height}")
                  </span>
                )}
              </div>
            )}
            
            {/* Carrier & Service */}
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Carrier:</span>
              <span>{shipment.carrier} - {shipment.service}</span>
            </div>
            
            {/* Cost */}
            {shipment.cost > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Cost:</span>
                <span className="font-medium">${shipment.cost.toFixed(2)}</span>
              </div>
            )}

            {/* Weight */}
            {shipment.weight && shipment.weight > 0 && (
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Weight:</span>
                <span>{shipment.weight} lbs</span>
              </div>
            )}
            
            {/* Estimated Delivery Date */}
            {shipment.estimatedDeliveryDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Est. Delivery:</span>
                <span>{format(new Date(shipment.estimatedDeliveryDate), "MMM dd, yyyy")}</span>
              </div>
            )}

            {/* Actual Delivery Date */}
            {shipment.actualDeliveryDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-muted-foreground">Delivered:</span>
                <span className="font-medium text-green-600">
                  {format(new Date(shipment.actualDeliveryDate), "MMM dd, yyyy")}
                </span>
              </div>
            )}
            
            {/* Expandable items section */}
            {shipment.items.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(`${shipment.id}-${shipment.packageIndex}`)}
                  className="flex items-center gap-2 -ml-2"
                >
                  {expandedShipments.has(`${shipment.id}-${shipment.packageIndex}`) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="text-sm">Items in this package ({shipment.items.length})</span>
                </Button>
                
                {expandedShipments.has(`${shipment.id}-${shipment.packageIndex}`) && (
                  <div className="ml-6 mt-2 space-y-2">
                    {shipment.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm py-1 border-b last:border-b-0">
                        <span className="font-medium min-w-[60px]">Qty: {item.quantity}</span>
                        <span className="flex-1">{item.name || item.sku || item.itemId}</span>
                        {item.unitPrice && (
                          <span className="text-muted-foreground">${item.unitPrice.toFixed(2)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

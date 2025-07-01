
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody } from "@/components/ui/table";
import { toast } from "sonner";
import { BulkShippingLabelDialog } from "./BulkShippingLabelDialog";
import { BulkShipControls } from "./table/BulkShipControls";
import { BulkShipTableHeader } from "./table/BulkShipTableHeader";
import { BulkShipTableRow } from "./table/BulkShipTableRow";

interface OrderForShipping {
  id: string;
  customerName: string;
  items: any[];
  value: number;
  shippingAddress: any;
  recommendedBox: any;
  recommendedService?: string;
}

interface ShippingResult {
  orderId: string;
  success: boolean;
  trackingNumber?: string;
  labelUrl?: string;
  cost?: number;
  error?: string;
}

interface BulkShipOrdersTableProps {
  boxName: string;
  boxDimensions: string;
  orders: OrderForShipping[];
  onBulkShip: (selectedOrders: OrderForShipping[]) => Promise<ShippingResult[]>;
}

export const BulkShipOrdersTable = ({ boxName, boxDimensions, orders, onBulkShip }: BulkShipOrdersTableProps) => {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isShipping, setIsShipping] = useState(false);
  const [showLabelsDialog, setShowLabelsDialog] = useState(false);
  const [shipmentLabels, setShipmentLabels] = useState<Array<{
    orderId: string;
    labelUrl: string;
    trackingNumber: string;
    carrier: string;
    service: string;
  }>>([]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(orders.map(order => order.id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleBulkShip = async () => {
    if (selectedOrders.size === 0) {
      toast.error("Please select at least one order to ship");
      return;
    }

    setIsShipping(true);
    try {
      const ordersToShip = orders.filter(order => selectedOrders.has(order.id));
      console.log('Calling bulk ship for orders:', ordersToShip.map(o => o.id));
      
      const results = await onBulkShip(ordersToShip);
      console.log('Bulk shipping results:', results);
      
      // Filter successful shipments and create label data
      const successfulResults = results.filter(result => result.success && result.labelUrl);
      
      if (successfulResults.length > 0) {
        const labels = successfulResults.map(result => {
          const order = ordersToShip.find(o => o.id === result.orderId);
          return {
            orderId: result.orderId,
            labelUrl: result.labelUrl!,
            trackingNumber: result.trackingNumber || 'N/A',
            carrier: 'UPS', // This would come from the shipping service response
            service: order?.recommendedService || 'Ground'
          };
        });

        setShipmentLabels(labels);
        setShowLabelsDialog(true);
        
        toast.success(`Successfully created ${successfulResults.length} shipping labels`);
      }
      
      const failedResults = results.filter(result => !result.success);
      if (failedResults.length > 0) {
        toast.error(`Failed to ship ${failedResults.length} orders`);
        failedResults.forEach(result => {
          console.error(`Order ${result.orderId} failed:`, result.error);
        });
      }
      
      // Clear selection after processing
      setSelectedOrders(new Set());
      
    } catch (error) {
      console.error('Bulk shipping error:', error);
      toast.error("Failed to initiate bulk shipping. Please try again.");
    } finally {
      setIsShipping(false);
    }
  };

  if (orders.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="mt-4">
        <CardHeader>
          <BulkShipControls
            boxName={boxName}
            boxDimensions={boxDimensions}
            orderCount={orders.length}
            selectedCount={selectedOrders.size}
            isShipping={isShipping}
            onBulkShip={handleBulkShip}
          />
        </CardHeader>
        <CardContent>
          <Table>
            <BulkShipTableHeader
              selectedCount={selectedOrders.size}
              totalCount={orders.length}
              onSelectAll={handleSelectAll}
            />
            <TableBody>
              {orders.map((order) => (
                <BulkShipTableRow
                  key={order.id}
                  order={order}
                  isSelected={selectedOrders.has(order.id)}
                  onSelectOrder={handleSelectOrder}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BulkShippingLabelDialog
        isOpen={showLabelsDialog}
        onClose={() => setShowLabelsDialog(false)}
        shipmentLabels={shipmentLabels}
      />
    </>
  );
};

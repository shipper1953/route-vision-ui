
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody } from "@/components/ui/table";
import { toast } from "sonner";
import { BulkShippingLabelDialog } from "./BulkShippingLabelDialog";
import { BulkShipRatesDialog } from "./dialogs/BulkShipRatesDialog";
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
  packageWeight?: {
    itemsWeight: number;
    boxWeight: number;
    totalWeight: number;
  };
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
  onFetchRates: (selectedOrders: OrderForShipping[]) => Promise<OrderWithRates[]>;
  onBulkShip: (selectedOrders: OrderWithRates[]) => Promise<ShippingResult[]>;
  onRefresh?: () => Promise<void>;
}

interface OrderWithRates extends OrderForShipping {
  rates: Array<{
    id: string;
    carrier: string;
    service: string;
    rate: string;
    delivery_days?: number;
  }>;
  selectedRateId?: string;
}

export const BulkShipOrdersTable = ({ boxName, boxDimensions, orders, onFetchRates, onBulkShip, onRefresh }: BulkShipOrdersTableProps) => {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [isShipping, setIsShipping] = useState(false);
  const [showRatesDialog, setShowRatesDialog] = useState(false);
  const [showLabelsDialog, setShowLabelsDialog] = useState(false);
  const [ordersWithRates, setOrdersWithRates] = useState<OrderWithRates[]>([]);
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

  const handleFetchRates = async () => {
    if (selectedOrders.size === 0) {
      toast.error("Please select at least one order to fetch rates");
      return;
    }

    setIsFetchingRates(true);
    try {
      const ordersToFetch = orders.filter(order => selectedOrders.has(order.id));
      console.log('Fetching rates for orders:', ordersToFetch.map(o => o.id));
      
      const ordersWithRatesData = await onFetchRates(ordersToFetch);
      setOrdersWithRates(ordersWithRatesData);
      setShowRatesDialog(true);
      
    } catch (error) {
      console.error('Rate fetching error:', error);
      toast.error("Failed to fetch shipping rates. Please try again.");
    } finally {
      setIsFetchingRates(false);
    }
  };

  const handleShipOrders = async (ordersWithSelectedRates: OrderWithRates[]): Promise<ShippingResult[]> => {
    setIsShipping(true);
    try {
      const results = await onBulkShip(ordersWithSelectedRates);
      console.log('Bulk shipping results:', results);
      
      // Filter successful shipments and create label data
      const successfulResults = results.filter(result => result.success && result.labelUrl);
      
      if (successfulResults.length > 0) {
        const labels = successfulResults.map(result => {
          const order = ordersWithSelectedRates.find(o => o.id === result.orderId);
          const selectedRate = order?.rates?.find(r => r.id === order.selectedRateId);
          return {
            orderId: result.orderId,
            labelUrl: result.labelUrl!,
            trackingNumber: result.trackingNumber || 'N/A',
            carrier: selectedRate?.carrier || 'UPS',
            service: selectedRate?.service || 'Ground'
          };
        });

        setShipmentLabels(labels);
        setShowLabelsDialog(true);
      }
      
      // Clear selection after processing
      setSelectedOrders(new Set());
      setShowRatesDialog(false);
      
      return results;
      
    } catch (error) {
      console.error('Bulk shipping error:', error);
      toast.error("Failed to initiate bulk shipping. Please try again.");
      return [];
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
            isFetchingRates={isFetchingRates}
            onFetchRates={handleFetchRates}
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

      <BulkShipRatesDialog
        isOpen={showRatesDialog}
        onClose={() => setShowRatesDialog(false)}
        orders={ordersWithRates}
        isShipping={isShipping}
        onShipOrders={handleShipOrders}
      />

      <BulkShippingLabelDialog
        isOpen={showLabelsDialog}
        onClose={async () => {
          setShowLabelsDialog(false);
          if (onRefresh) {
            await onRefresh();
          }
        }}
        shipmentLabels={shipmentLabels}
      />
    </>
  );
};

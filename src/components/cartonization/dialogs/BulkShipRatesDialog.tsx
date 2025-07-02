import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface OrderWithRates {
  id: string;
  customerName: string;
  items: any[];
  value: number;
  shippingAddress: any;
  recommendedBox: any;
  rates: Array<{
    id: string;
    carrier: string;
    service: string;
    rate: string;
    delivery_days?: number;
  }>;
  selectedRateId?: string;
}

interface ShippingResult {
  orderId: string;
  success: boolean;
  trackingNumber?: string;
  labelUrl?: string;
  cost?: number;
  error?: string;
}

interface BulkShipRatesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderWithRates[];
  isShipping: boolean;
  onShipOrders: (ordersWithSelectedRates: OrderWithRates[]) => Promise<ShippingResult[]>;
}

export const BulkShipRatesDialog = ({
  isOpen,
  onClose,
  orders,
  isShipping,
  onShipOrders
}: BulkShipRatesDialogProps) => {
  const [ordersWithSelections, setOrdersWithSelections] = useState<OrderWithRates[]>(orders);

  // Update orders when prop changes
  useEffect(() => {
    if (orders.length > 0) {
      setOrdersWithSelections(orders.map(order => ({
        ...order,
        selectedRateId: order.rates?.[0]?.id || undefined
      })));
    }
  }, [orders]);

  const handleRateSelection = (orderId: string, rateId: string) => {
    setOrdersWithSelections(prev => 
      prev.map(order => 
        order.id === orderId 
          ? { ...order, selectedRateId: rateId }
          : order
      )
    );
  };

  const handleShipSelected = async () => {
    const ordersWithValidRates = ordersWithSelections.filter(order => order.selectedRateId);
    
    if (ordersWithValidRates.length === 0) {
      toast.error("Please select rates for all orders");
      return;
    }

    try {
      const results = await onShipOrders(ordersWithValidRates);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        toast.success(`Successfully shipped ${successCount} order${successCount > 1 ? 's' : ''}`);
      }
      
      if (failCount > 0) {
        toast.error(`Failed to ship ${failCount} order${failCount > 1 ? 's' : ''}`);
      }
      
      onClose();
    } catch (error) {
      console.error('Shipping error:', error);
      toast.error("Failed to ship orders");
    }
  };

  const getSelectedRate = (order: OrderWithRates) => {
    return order.rates?.find(rate => rate.id === order.selectedRateId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Select Shipping Rates for Orders
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Recommended Rate</TableHead>
                <TableHead>Select Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersWithSelections.map((order) => {
                const selectedRate = getSelectedRate(order);
                const recommendedRate = order.rates?.[0];
                
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {order.id}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>${order.value.toFixed(2)}</TableCell>
                    <TableCell>
                      {recommendedRate ? (
                        <div className="space-y-1">
                          <div className="font-medium">
                            {recommendedRate.carrier} {recommendedRate.service}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ${recommendedRate.rate}
                            {recommendedRate.delivery_days && ` • ${recommendedRate.delivery_days} days`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No rates available</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={order.selectedRateId || ""}
                        onValueChange={(value) => handleRateSelection(order.id, value)}
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Select rate" />
                        </SelectTrigger>
                        <SelectContent>
                          {order.rates?.map((rate) => (
                            <SelectItem key={rate.id} value={rate.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{rate.carrier} {rate.service}</span>
                                <span className="ml-2 text-muted-foreground">
                                  ${rate.rate}
                                  {rate.delivery_days && ` • ${rate.delivery_days}d`}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {ordersWithSelections.filter(o => o.selectedRateId).length} of {ordersWithSelections.length} orders have rates selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isShipping}>
              Cancel
            </Button>
            <Button 
              onClick={handleShipSelected}
              disabled={isShipping || ordersWithSelections.filter(o => o.selectedRateId).length === 0}
              className="gap-2"
            >
              {isShipping ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Shipping...
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4" />
                  Ship Selected ({ordersWithSelections.filter(o => o.selectedRateId).length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddressFormSection } from "@/components/shipment/AddressFormSection";
import { PackageDetailsSection } from "@/components/shipment/PackageDetailsSection";
import { ShippingOptionsSection } from "@/components/shipment/ShippingOptionsSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Package, CheckSquare } from "lucide-react";

interface ShipmentFormTabsProps {
  orderItems?: any[];
  selectedItems?: any[];
  onItemsSelected?: (items: any[]) => void;
  itemsAlreadyShipped?: Array<{ itemId: string; quantityShipped: number }>;
  orderId?: string;
}

export const ShipmentFormTabs = ({ 
  orderItems = [], 
  selectedItems = [], 
  onItemsSelected, 
  itemsAlreadyShipped = [],
  orderId 
}: ShipmentFormTabsProps) => {
  const handleItemQuantityChange = (itemId: string, quantity: number, item: any) => {
    if (!onItemsSelected) return;
    
    if (quantity === 0) {
      // Remove item from selection
      onItemsSelected(selectedItems.filter(si => (si.itemId || si.id) !== itemId));
    } else {
      // Update or add item
      const updated = selectedItems.filter(si => (si.itemId || si.id) !== itemId);
      updated.push({
        itemId,
        name: item.name,
        sku: item.sku,
        quantity,
        unitPrice: item.unitPrice,
        dimensions: item.dimensions
      });
      onItemsSelected(updated);
    }
  };

  return (
    <Tabs defaultValue="addresses" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="addresses">Addresses</TabsTrigger>
        <TabsTrigger value="package">Package Details</TabsTrigger>
        <TabsTrigger value="options">Shipping Options</TabsTrigger>
      </TabsList>
      
      <TabsContent value="addresses" className="space-y-6">
        <AddressFormSection 
          type="from" 
          title="From Address" 
          description="Sender information and address"
        />
        <AddressFormSection 
          type="to" 
          title="To Address" 
          description="Recipient information and address"
        />
      </TabsContent>
      
      <TabsContent value="package" className="space-y-6">
        {/* Item Selection Summary */}
        {selectedItems && selectedItems.length > 0 && orderId && (
          <Alert>
            <Package className="h-4 w-4" />
            <AlertTitle>Items to Ship</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                {selectedItems.map(item => (
                  <div key={item.itemId || item.id} className="flex justify-between text-sm">
                    <span>{item.name} ({item.sku})</span>
                    <span className="font-medium">Qty: {item.quantity}</span>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Manual Item Selection for Orders */}
        {orderItems && orderItems.length > 0 && orderId && onItemsSelected && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Select Items for This Shipment
              </CardTitle>
              <CardDescription>
                Choose which items and quantities to include in this package
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orderItems.map(item => {
                  const itemId = item.itemId || item.id;
                  const alreadyShipped = itemsAlreadyShipped?.find(i => i.itemId === itemId)?.quantityShipped || 0;
                  const remaining = (item.quantity || 0) - alreadyShipped;
                  const selectedItem = selectedItems.find(si => (si.itemId || si.id) === itemId);
                  const selectedQty = selectedItem?.quantity || 0;
                  
                  return (
                    <div key={itemId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          SKU: {item.sku} | Available: {remaining} of {item.quantity}
                          {alreadyShipped > 0 && ` (${alreadyShipped} already shipped)`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max={remaining}
                          value={selectedQty}
                          onChange={(e) => {
                            const newQty = parseInt(e.target.value) || 0;
                            if (newQty <= remaining) {
                              handleItemQuantityChange(itemId, newQty, item);
                            }
                          }}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">units</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <PackageDetailsSection 
          orderItems={orderItems}
          selectedItems={selectedItems}
          onItemsSelected={onItemsSelected}
          itemsAlreadyShipped={itemsAlreadyShipped}
          orderId={orderId}
        />
      </TabsContent>
      
      <TabsContent value="options" className="space-y-6">
        <ShippingOptionsSection />
      </TabsContent>
    </Tabs>
  );
};

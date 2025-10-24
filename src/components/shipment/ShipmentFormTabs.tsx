
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddressFormSection } from "@/components/shipment/AddressFormSection";
import { PackageDetailsSection } from "@/components/shipment/PackageDetailsSection";
import { ShippingOptionsSection } from "@/components/shipment/ShippingOptionsSection";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Package } from "lucide-react";

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

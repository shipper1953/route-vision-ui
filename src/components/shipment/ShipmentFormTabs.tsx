
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddressFormSection } from "@/components/shipment/AddressFormSection";
import { PackageDetailsSection } from "@/components/shipment/PackageDetailsSection";
import { ShippingOptionsSection } from "@/components/shipment/ShippingOptionsSection";

interface ShipmentFormTabsProps {
  orderItems?: any[];
  selectedItems?: any[];
  onItemsSelected?: (items: any[]) => void;
  itemsAlreadyShipped?: Array<{ itemId: string; quantityShipped: number }>;
}

export const ShipmentFormTabs = ({ 
  orderItems = [],
  selectedItems = [],
  onItemsSelected,
  itemsAlreadyShipped = []
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
        <PackageDetailsSection 
          orderItems={orderItems}
          selectedItems={selectedItems}
          onItemsSelected={onItemsSelected}
          itemsAlreadyShipped={itemsAlreadyShipped}
        />
      </TabsContent>
      
      <TabsContent value="options" className="space-y-6">
        <ShippingOptionsSection />
      </TabsContent>
    </Tabs>
  );
};

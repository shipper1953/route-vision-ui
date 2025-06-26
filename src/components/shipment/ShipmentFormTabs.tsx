
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddressFormGrid } from "@/components/shipment/AddressFormGrid";
import { PackageDetailsSection } from "@/components/shipment/PackageDetailsSection";
import { ShippingOptionsSection } from "@/components/shipment/ShippingOptionsSection";

interface ShipmentFormTabsProps {
  orderItems?: any[];
}

export const ShipmentFormTabs = ({ orderItems = [] }: ShipmentFormTabsProps) => {
  return (
    <Tabs defaultValue="addresses" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="addresses">Addresses</TabsTrigger>
        <TabsTrigger value="package">Package Details</TabsTrigger>
        <TabsTrigger value="options">Shipping Options</TabsTrigger>
      </TabsList>
      
      <TabsContent value="addresses" className="space-y-6">
        <AddressFormGrid />
      </TabsContent>
      
      <TabsContent value="package" className="space-y-6">
        <PackageDetailsSection orderItems={orderItems} />
      </TabsContent>
      
      <TabsContent value="options" className="space-y-6">
        <ShippingOptionsSection />
      </TabsContent>
    </Tabs>
  );
};

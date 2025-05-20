
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddressFormSection } from "./AddressFormSection";
import { PackageDetailsSection } from "./PackageDetailsSection";
import { ShippingOptionsSection } from "./ShippingOptionsSection";

export const ShipmentFormTabs = () => {
  return (
    <Tabs defaultValue="addresses" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="addresses">Addresses</TabsTrigger>
        <TabsTrigger value="package">Package Details</TabsTrigger>
        <TabsTrigger value="options">Shipping Options</TabsTrigger>
      </TabsList>
      
      <TabsContent value="addresses" className="space-y-6 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AddressFormSection 
            type="from" 
            title="From Address" 
            description="Enter the sender's address information"
          />
          <AddressFormSection 
            type="to" 
            title="To Address" 
            description="Enter the recipient's address information"
          />
        </div>
      </TabsContent>
      
      <TabsContent value="package" className="mt-6">
        <PackageDetailsSection />
      </TabsContent>
      
      <TabsContent value="options" className="mt-6">
        <ShippingOptionsSection />
      </TabsContent>
    </Tabs>
  );
};

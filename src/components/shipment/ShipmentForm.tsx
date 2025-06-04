
import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShipmentFormTabs } from "@/components/shipment/ShipmentFormTabs";
import { ShipmentResponse, SmartRate, Rate } from "@/services/easypost";
import { shipmentSchema, ShipmentForm as ShipmentFormType } from "@/types/shipment";
import { useDefaultAddressValues } from "@/hooks/useDefaultAddressValues";
import { OrderLookupSection } from "./form/OrderLookupSection";
import { ShipmentFormSubmission } from "./form/ShipmentFormSubmission";

interface ShipmentFormProps {
  onShipmentCreated: (response: ShipmentResponse, selectedRate: SmartRate | Rate | null) => void;
}

export const ShipmentForm = ({ onShipmentCreated }: ShipmentFormProps) => {
  const [loading, setLoading] = useState(false);
  const [orderLookupComplete, setOrderLookupComplete] = useState(false);
  const { getDefaultShippingAddress, warehouseAddress } = useDefaultAddressValues();
  
  const form = useForm<ShipmentFormType>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      // Default values for recipient
      toName: "",
      toStreet1: "",
      toCity: "",
      toState: "",
      toZip: "",
      toCountry: "US",
      
      length: 0,
      width: 0,
      height: 0,
      weight: 0,
      
      orderBarcode: "",
      orderId: "",
      requiredDeliveryDate: "",
      shipmentId: "",
      
      // These will be set when warehouse data loads
      fromName: "",
      fromCompany: "",
      fromStreet1: "",
      fromStreet2: "",
      fromCity: "",
      fromState: "",
      fromZip: "",
      fromCountry: "US",
      fromPhone: "",
      fromEmail: "",
    }
  });

  // Update form with warehouse address when it loads
  useEffect(() => {
    if (warehouseAddress) {
      const defaultAddress = getDefaultShippingAddress();
      console.log("Setting default warehouse address in form:", defaultAddress);
      
      // Set all the "from" address fields
      Object.entries(defaultAddress).forEach(([key, value]) => {
        form.setValue(key as keyof ShipmentFormType, value);
      });
    }
  }, [warehouseAddress, getDefaultShippingAddress, form]);
  
  return (
    <FormProvider {...form}>
      <OrderLookupSection setOrderLookupComplete={setOrderLookupComplete} />
      
      <form onSubmit={form.handleSubmit(() => {})} className="space-y-8">
        <ShipmentFormTabs />
        
        <ShipmentFormSubmission 
          loading={loading}
          setLoading={setLoading}
          onShipmentCreated={onShipmentCreated}
        />
      </form>
    </FormProvider>
  );
};


import { useState } from "react";
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
  const { getDefaultShippingAddress } = useDefaultAddressValues();
  
  const form = useForm<ShipmentFormType>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      // Load default shipping address from profile settings
      ...getDefaultShippingAddress(),
      
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
    }
  });
  
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

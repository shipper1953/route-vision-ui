
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
  const [orderItems, setOrderItems] = useState<any[]>([]);
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
    if (warehouseAddress?.address) {
      console.log("Warehouse address available, setting form values:", warehouseAddress);
      const defaultAddress = getDefaultShippingAddress();
      console.log("Default shipping address to set:", defaultAddress);
      
      // Set each field individually to ensure proper form updates
      form.setValue("fromName", defaultAddress.fromName);
      form.setValue("fromCompany", defaultAddress.fromCompany);
      form.setValue("fromStreet1", defaultAddress.fromStreet1);
      form.setValue("fromStreet2", defaultAddress.fromStreet2);
      form.setValue("fromCity", defaultAddress.fromCity);
      form.setValue("fromState", defaultAddress.fromState);
      form.setValue("fromZip", defaultAddress.fromZip);
      form.setValue("fromCountry", defaultAddress.fromCountry);
      form.setValue("fromPhone", defaultAddress.fromPhone);
      form.setValue("fromEmail", defaultAddress.fromEmail);
      
      console.log("Form values after setting warehouse address:", form.getValues());
    } else {
      console.log("Warehouse address not yet available:", warehouseAddress);
    }
  }, [warehouseAddress, form, getDefaultShippingAddress]);
  
  return (
    <FormProvider {...form}>
      <OrderLookupSection 
        setOrderLookupComplete={setOrderLookupComplete} 
        setOrderItems={setOrderItems}
      />
      
      <form onSubmit={form.handleSubmit(() => {})} className="space-y-8">
        <ShipmentFormTabs orderItems={orderItems} />
        
        <ShipmentFormSubmission 
          loading={loading}
          setLoading={setLoading}
          onShipmentCreated={onShipmentCreated}
        />
      </form>
    </FormProvider>
  );
};

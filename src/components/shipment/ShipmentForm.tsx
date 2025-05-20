
import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { OrderLookupCard } from "@/components/shipment/OrderLookupCard";
import { ShipmentFormTabs } from "@/components/shipment/ShipmentFormTabs";
import { RatesActionButton } from "@/components/shipment/RatesActionButton";
import easyPostService, { ShipmentResponse } from "@/services/easypost";
import { shipmentSchema, ShipmentForm as ShipmentFormType } from "@/types/shipment";
import { useDefaultAddressValues } from "@/hooks/useDefaultAddressValues";

interface ShipmentFormProps {
  onShipmentCreated: (response: ShipmentResponse, selectedRate: any) => void;
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
      shipmentId: "", // Add shipmentId to store the EasyPost shipment ID
    }
  });
  
  const onSubmit = async (data: ShipmentFormType) => {
    try {
      setLoading(true);
      
      const shipmentData = {
        from_address: {
          name: data.fromName,
          company: data.fromCompany,
          street1: data.fromStreet1,
          street2: data.fromStreet2,
          city: data.fromCity,
          state: data.fromState,
          zip: data.fromZip,
          country: data.fromCountry,
          phone: data.fromPhone,
          email: data.fromEmail
        },
        to_address: {
          name: data.toName,
          company: data.toCompany,
          street1: data.toStreet1,
          street2: data.toStreet2,
          city: data.toCity,
          state: data.toState,
          zip: data.toZip,
          country: data.toCountry,
          phone: data.toPhone,
          email: data.toEmail
        },
        parcel: {
          length: data.length,
          width: data.width,
          height: data.height,
          weight: data.weight
        }
      };
      
      const response = await easyPostService.createShipment(shipmentData);
      
      // Store the shipment ID in the form context
      form.setValue("shipmentId", response.id);
      
      // Find recommended rate based on required delivery date
      let recommendedRate = null;
      
      if (data.requiredDeliveryDate) {
        const requiredDate = new Date(data.requiredDeliveryDate);
        
        // Find a rate that can deliver by the required date
        if (response.smartrates) {
          const recommendedOptions = response.smartrates.filter(rate => {
            if (!rate.delivery_date) return false;
            const deliveryDate = new Date(rate.delivery_date);
            return deliveryDate <= requiredDate;
          });
          
          if (recommendedOptions.length > 0) {
            // Sort by price (lowest first) from rates that meet the deadline
            recommendedRate = recommendedOptions.sort((a, b) => 
              parseFloat(a.rate) - parseFloat(b.rate)
            )[0];
            
            toast.success("Recommended shipping option selected based on required delivery date");
          } else {
            toast.warning("No shipping options available to meet the required delivery date");
          }
        }
      }
      
      toast.success("Shipment rates retrieved successfully");
      onShipmentCreated(response, recommendedRate);
    } catch (error) {
      console.error("Error creating shipment:", error);
      toast.error("Failed to retrieve shipment rates");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <FormProvider {...form}>
      <OrderLookupCard setOrderLookupComplete={setOrderLookupComplete} />
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <ShipmentFormTabs />
        
        <div className="flex justify-end">
          <RatesActionButton loading={loading} />
        </div>
      </form>
    </FormProvider>
  );
};

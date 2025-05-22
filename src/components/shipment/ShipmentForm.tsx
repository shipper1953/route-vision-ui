
import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { OrderLookupCard } from "@/components/shipment/OrderLookupCard";
import { ShipmentFormTabs } from "@/components/shipment/ShipmentFormTabs";
import { RatesActionButton } from "@/components/shipment/RatesActionButton";
import easyPostService, { ShipmentResponse, SmartRate } from "@/services/easypost";
import { shipmentSchema, ShipmentForm as ShipmentFormType } from "@/types/shipment";
import { useDefaultAddressValues } from "@/hooks/useDefaultAddressValues";

interface ShipmentFormProps {
  onShipmentCreated: (response: ShipmentResponse, selectedRate: SmartRate | null) => void;
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
      toast.info("Getting shipping rates...");
      
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
        },
        // Add options to ensure SmartRate functionality
        options: {
          // Use high accuracy level for delivery estimates (95th percentile)
          smartrate_accuracy: 'percentile_95'
        }
      };
      
      console.log("Creating shipment with data:", shipmentData);
      
      const response = await easyPostService.createShipment(shipmentData);
      
      // Store the shipment ID in the form context
      form.setValue("shipmentId", response.id);
      
      if (!response.rates?.length && !response.smartrates?.length) {
        toast.error("No shipping rates available. Please check your package dimensions and try again.");
        setLoading(false);
        return;
      }
      
      // Find recommended rate based on required delivery date
      let recommendedRate = null;
      
      if (data.requiredDeliveryDate) {
        const requiredDate = new Date(data.requiredDeliveryDate);
        
        // First check SmartRates if available
        if (response.smartrates && response.smartrates.length > 0) {
          // Filter by rates that will deliver by the required date
          const viableRates = response.smartrates.filter(rate => {
            if (!rate.delivery_date) return false;
            const deliveryDate = new Date(rate.delivery_date);
            return deliveryDate <= requiredDate;
          });
          
          if (viableRates.length > 0) {
            // First prioritize delivery date guaranteed options
            const guaranteedRates = viableRates.filter(rate => rate.delivery_date_guaranteed);
            
            if (guaranteedRates.length > 0) {
              // Sort guaranteed rates by price (lowest first)
              recommendedRate = guaranteedRates.sort((a, b) => 
                parseFloat(a.rate) - parseFloat(b.rate)
              )[0];
              toast.success("Recommended shipping option with guaranteed delivery selected");
            } else {
              // If no guaranteed options, sort by price (lowest first) from rates that meet the deadline
              recommendedRate = viableRates.sort((a, b) => 
                parseFloat(a.rate) - parseFloat(b.rate)
              )[0];
              toast.success("Recommended shipping option selected based on required delivery date");
            }
          } else {
            toast.warning("No shipping options available to meet the required delivery date");
            
            // If no options meet the required date, find the fastest option
            if (response.smartrates.length > 0) {
              const sortedByDelivery = [...response.smartrates].sort((a, b) => {
                if (!a.delivery_date) return 1;
                if (!b.delivery_date) return -1;
                return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
              });
              recommendedRate = sortedByDelivery[0];
              toast.info("Selected fastest available shipping option instead");
            }
          }
        } 
        // Fall back to regular rates if smartrates aren't available
        else if (response.rates && response.rates.length > 0) {
          // Sort regular rates by delivery days if available
          const sortedRates = [...response.rates].sort((a, b) => {
            if (a.delivery_days === undefined) return 1;
            if (b.delivery_days === undefined) return -1;
            return a.delivery_days - b.delivery_days;
          });
          
          // Select the fastest option for standard rates
          toast.info("Using standard rates (SmartRates not available)");
          recommendedRate = sortedRates[0];
        }
      } else if (response.smartrates && response.smartrates.length > 0) {
        // If no required date specified, recommend the most economical option
        recommendedRate = response.smartrates.sort((a, b) => 
          parseFloat(a.rate) - parseFloat(b.rate)
        )[0];
        toast.success("Most economical shipping option selected");
      } else if (response.rates && response.rates.length > 0) {
        // Fall back to standard rates
        recommendedRate = response.rates.sort((a, b) => 
          parseFloat(a.rate) - parseFloat(b.rate)
        )[0];
        toast.success("Most economical shipping option selected (standard rates)");
      }
      
      toast.success("Shipment rates retrieved successfully");
      onShipmentCreated(response, recommendedRate);
    } catch (error) {
      console.error("Error creating shipment:", error);
      toast.error(error instanceof Error ? error.message : "Failed to retrieve shipment rates. Please try again.");
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

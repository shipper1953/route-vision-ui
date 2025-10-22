
import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShipmentFormTabs } from "@/components/shipment/ShipmentFormTabs";
import { SmartRate, Rate } from "@/services/easypost";
import { CombinedRateResponse } from "@/services/rateShoppingService";
import { shipmentSchema, ShipmentForm as ShipmentFormType } from "@/types/shipment";
import { useDefaultAddressValues } from "@/hooks/useDefaultAddressValues";
import { OrderLookupSection } from "./form/OrderLookupSection";
import { ShipmentFormSubmission } from "./form/ShipmentFormSubmission";
import { SelectedItem } from "@/types/fulfillment";
import { supabase } from "@/integrations/supabase/client";

interface ShipmentFormProps {
  onShipmentCreated: (response: CombinedRateResponse, selectedRate: SmartRate | Rate | null, selectedBoxData?: any) => void;
}

export const ShipmentForm = ({ onShipmentCreated }: ShipmentFormProps) => {
  const [loading, setLoading] = useState(false);
  const [orderLookupComplete, setOrderLookupComplete] = useState(false);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedBoxData, setSelectedBoxData] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [itemsAlreadyShipped, setItemsAlreadyShipped] = useState<{ [itemId: string]: number }>({});
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
  }, [warehouseAddress]); // Removed form and getDefaultShippingAddress from dependencies

  // Debug log to track orderItems state changes
  useEffect(() => {
    console.log("ShipmentForm - orderItems updated:", orderItems);
  }, [orderItems]);

  // Fetch items already shipped when orderId changes
  useEffect(() => {
    const fetchShippedItems = async () => {
      const orderId = form.getValues('orderId');
      if (!orderId) return;

      try {
        const { data: shipments, error } = await supabase
          .from('order_shipments')
          .select('package_info')
          .eq('order_id', parseInt(orderId, 10));

        if (error) {
          console.error('Error fetching shipped items:', error);
          return;
        }

        // Calculate quantities already shipped for each item
        const shippedMap: { [itemId: string]: number } = {};
        shipments?.forEach(shipment => {
          const packageInfo = shipment.package_info as any;
          const items = packageInfo?.items || [];
          items.forEach((item: any) => {
            shippedMap[item.itemId] = (shippedMap[item.itemId] || 0) + item.quantity;
          });
        });

        setItemsAlreadyShipped(shippedMap);
        console.log('Items already shipped:', shippedMap);
      } catch (err) {
        console.error('Error calculating shipped items:', err);
      }
    };

    fetchShippedItems();
  }, [form.watch('orderId')]);
  
  return (
    <FormProvider {...form}>
      <OrderLookupSection 
        setOrderLookupComplete={setOrderLookupComplete} 
        setOrderItems={setOrderItems}
      />
      
      <form onSubmit={form.handleSubmit(() => {})} className="space-y-8">
        {/* Item selection now integrated into Package Details tab */}
        
        <ShipmentFormTabs 
          orderItems={orderItems}
          selectedItems={selectedItems}
          onItemsSelected={setSelectedItems}
          itemsAlreadyShipped={Object.entries(itemsAlreadyShipped).map(([itemId, quantityShipped]) => ({
            itemId,
            quantityShipped
          }))}
          orderId={form.watch('orderId')}
        />
        
        <ShipmentFormSubmission 
          loading={loading}
          setLoading={setLoading}
          selectedItems={selectedItems}
          onShipmentCreated={(response, selectedRate, boxData) => {
            if (boxData) {
              setSelectedBoxData(boxData);
            }
            onShipmentCreated(response, selectedRate, boxData);
          }}
        />
      </form>
    </FormProvider>
  );
};

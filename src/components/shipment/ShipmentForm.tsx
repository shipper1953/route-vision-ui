
import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShipmentFormTabs } from "@/components/shipment/ShipmentFormTabs";
import { SmartRate, Rate } from "@/services/easypost";
import { CombinedRateResponse } from "@/services/rateShoppingService";
import { shipmentSchema, ShipmentForm as ShipmentFormType } from "@/types/shipment";
import { OrderLookupSection } from "./form/OrderLookupSection";
import { ShipmentFormSubmission } from "./form/ShipmentFormSubmission";
import { SelectedItem } from "@/types/fulfillment";
import { supabase } from "@/integrations/supabase/client";

interface ShipmentFormProps {
  onLabelPurchased?: (result: any) => void;
}

export const ShipmentForm = ({ onLabelPurchased }: ShipmentFormProps) => {
  const [loading, setLoading] = useState(false);
  const [orderLookupComplete, setOrderLookupComplete] = useState(false);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedBoxData, setSelectedBoxData] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [itemsAlreadyShipped, setItemsAlreadyShipped] = useState<{ [itemId: string]: number }>({});
  const [itemsLoading, setItemsLoading] = useState(false);
  
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

  // Note: From address is now populated by WarehouseAddressSelector component
  // which provides a dropdown to switch warehouses and auto-fills the fields

  // Debug log to track orderItems state changes
  useEffect(() => {
    console.log("ShipmentForm - orderItems updated:", orderItems);
  }, [orderItems]);

  // Auto-select items when order is loaded - CRITICAL: runs early before user can click Get Rates
  useEffect(() => {
    // Only auto-select if we have items, nothing is currently selected, and order lookup is complete
    if (orderItems.length > 0 && selectedItems.length === 0 && orderLookupComplete) {
      setItemsLoading(true);
      console.log('🔄 Starting auto-selection for', orderItems.length, 'order items');
      
      // Auto-select all items that haven't been fully shipped
      const autoSelectedItems = orderItems
        .filter(item => {
          const itemId = item.itemId || item.id;
          const alreadyShipped = itemsAlreadyShipped[itemId] || 0;
          const remaining = (item.quantity || 0) - alreadyShipped;
          const hasRemaining = remaining > 0;
          
          if (!hasRemaining) {
            console.log(`⏭️ Skipping item ${item.name} (${itemId}): ${alreadyShipped} already shipped`);
          }
          
          return hasRemaining;
        })
        .map(item => {
          const itemId = item.itemId || item.id;
          const alreadyShipped = itemsAlreadyShipped[itemId] || 0;
          const remainingQty = (item.quantity || 0) - alreadyShipped;
          
          return {
            itemId,
            name: item.name,
            sku: item.sku,
            quantity: remainingQty,
            dimensions: item.dimensions
          };
        });
      
      if (autoSelectedItems.length > 0) {
        console.log('✅ Auto-selected', autoSelectedItems.length, 'available items:', autoSelectedItems);
        setSelectedItems(autoSelectedItems);
      } else {
        console.warn('⚠️ No items available to auto-select - all items may be fully shipped');
      }
      setItemsLoading(false);
    }
  }, [orderItems, itemsAlreadyShipped, orderLookupComplete]);

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
          loading={loading}
          setLoading={setLoading}
          itemsLoading={itemsLoading}
          hasOrderId={!!form.watch('orderId')}
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

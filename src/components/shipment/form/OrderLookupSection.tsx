
import { useState, useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { OrderLookupCard } from "@/components/shipment/OrderLookupCard";
import { fetchOrderById } from "@/services/orderService";
import { ShipmentForm } from "@/types/shipment";
import { supabase } from "@/integrations/supabase/client";

interface OrderLookupSectionProps {
  setOrderLookupComplete: (value: boolean) => void;
  setOrderItems: (items: any[]) => void;
}

export const OrderLookupSection = ({ setOrderLookupComplete, setOrderItems }: OrderLookupSectionProps) => {
  const [loading, setLoading] = useState(false);
  const form = useFormContext<ShipmentForm>();
  const [searchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get("orderId");
  const loadedOrderIdRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  // Helper to fetch warehouse and populate From address fields
  const populateFromWarehouse = async (warehouseId: string) => {
    try {
      const { data: warehouse, error } = await supabase
        .from('warehouses')
        .select('name, address, phone, email')
        .eq('id', warehouseId)
        .maybeSingle();

      if (error || !warehouse) {
        console.warn("Could not fetch warehouse for From address:", error);
        return;
      }

      const addr = (warehouse.address || {}) as any;
      form.setValue("fromName", warehouse.name || "");
      form.setValue("fromCompany", warehouse.name || "");
      form.setValue("fromStreet1", addr.street1 || "");
      form.setValue("fromStreet2", addr.street2 || "");
      form.setValue("fromCity", addr.city || "");
      form.setValue("fromState", addr.state || "");
      form.setValue("fromZip", addr.zip || "");
      form.setValue("fromCountry", addr.country || "US");
      form.setValue("fromPhone", warehouse.phone || "");
      form.setValue("fromEmail", warehouse.email || "");

      console.log("✅ From address populated from order's warehouse:", warehouse.name);
    } catch (err) {
      console.error("Error populating From warehouse address:", err);
    }
  };
  
  // Load order data if orderId is provided in the URL
  useEffect(() => {
    async function loadOrderFromId() {
      // Skip if no orderId, already loaded this order, or currently loading
      if (!orderIdFromUrl || 
          loadedOrderIdRef.current === orderIdFromUrl || 
          isLoadingRef.current) {
        return;
      }
      
      try {
        isLoadingRef.current = true;
        setLoading(true);
        loadedOrderIdRef.current = orderIdFromUrl; // Mark this order as being loaded
        console.log(`Loading order ${orderIdFromUrl} from URL...`);
        
        const order = await fetchOrderById(orderIdFromUrl);
        
        if (!order) {
          toast.error(`Order ${orderIdFromUrl} not found`);
          loadedOrderIdRef.current = null; // Reset if order not found
          return;
        }
        
        console.log("Order loaded from URL:", order);
        
        // Set the orderBarcode field to display the order ID
        form.setValue("orderBarcode", order.id);
        
        // Update form with customer data
        form.setValue("toName", order.customerName);
        form.setValue("toCompany", order.customerCompany || "");
        form.setValue("toPhone", order.customerPhone || "");
        form.setValue("toEmail", order.customerEmail || "");
        
        // Properly map shipping address fields from the order
        if (order.shippingAddress && Object.keys(order.shippingAddress).length > 0) {
          console.log("Setting shipping address from order:", order.shippingAddress);
          form.setValue("toStreet1", order.shippingAddress.street1 || order.shippingAddress.address1 || "");
          form.setValue("toStreet2", order.shippingAddress.street2 || order.shippingAddress.address2 || "");
          form.setValue("toCity", order.shippingAddress.city || "");
          form.setValue("toState", order.shippingAddress.state || "");
          form.setValue("toZip", order.shippingAddress.zip || "");
          form.setValue("toCountry", order.shippingAddress.country || "US");
        } else {
          console.warn("No valid shipping address found in order");
        }

        // Populate From address from the order's warehouse, falling back to
        // the company's default warehouse when the order has none assigned.
        let warehouseIdToUse = order.warehouseId;
        if (!warehouseIdToUse && order.companyId) {
          const { data: defaultWh } = await supabase
            .from('warehouses')
            .select('id')
            .eq('company_id', order.companyId)
            .eq('is_default', true)
            .maybeSingle();
          if (defaultWh?.id) {
            warehouseIdToUse = defaultWh.id;
            console.log("ℹ️ Order has no warehouse — using company default:", defaultWh.id);
          }
        }
        if (warehouseIdToUse) {
          await populateFromWarehouse(warehouseIdToUse);
        } else {
          toast.warning("This order has no warehouse and no company default is set. Please assign one.");
        }
        
        // Set parcel dimensions and weight from cartonization data (preferred) or parcelInfo
        if (order.recommendedBox) {
          console.log("Setting dimensions from recommended box:", order.recommendedBox);
          form.setValue("length", order.recommendedBox.length || 0);
          form.setValue("width", order.recommendedBox.width || 0);
          form.setValue("height", order.recommendedBox.height || 0);
          form.setValue("weight", order.packageWeight?.totalWeight || 0);
          toast.success(`Using recommended ${order.recommendedBox.name}`);
        } else if (order.parcelInfo && Object.keys(order.parcelInfo).length > 0) {
          console.log("Setting parcel info from order:", order.parcelInfo);
          form.setValue("length", order.parcelInfo.length || 0);
          form.setValue("width", order.parcelInfo.width || 0);
          form.setValue("height", order.parcelInfo.height || 0);
          form.setValue("weight", order.parcelInfo.weight || 0);
        }
        
        // Set order details
        form.setValue("orderId", order.id);
        form.setValue("requiredDeliveryDate", order.requiredDeliveryDate);
        
        // Pass order items to parent component
        if (order.items && Array.isArray(order.items) && order.items.length > 0) {
          console.log("Setting order items for packaging optimization:", order.items);
          setOrderItems(order.items);
        } else {
          setOrderItems([]);
        }
        
        toast.success("Order information loaded successfully");
        setOrderLookupComplete(true);
      } catch (error) {
        console.error("Error loading order from URL:", error);
        toast.error("Failed to load order information");
        loadedOrderIdRef.current = null;
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    }
    
    loadOrderFromId();
  }, [orderIdFromUrl]);
  
  // Reset the loaded order ref when orderIdFromUrl changes to a different order
  useEffect(() => {
    if (orderIdFromUrl !== loadedOrderIdRef.current && loadedOrderIdRef.current !== null) {
      loadedOrderIdRef.current = null;
      isLoadingRef.current = false;
    }
  }, [orderIdFromUrl]);
  
  return (
    <OrderLookupCard 
      setOrderLookupComplete={setOrderLookupComplete} 
      setOrderItems={setOrderItems}
    />
  );
};


import { useState, useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { OrderLookupCard } from "@/components/shipment/OrderLookupCard";
import { fetchOrderById } from "@/services/orderService";
import { ShipmentForm } from "@/types/shipment";

interface OrderLookupSectionProps {
  setOrderLookupComplete: (value: boolean) => void;
}

export const OrderLookupSection = ({ setOrderLookupComplete }: OrderLookupSectionProps) => {
  const [loading, setLoading] = useState(false);
  const form = useFormContext<ShipmentForm>();
  const [searchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get("orderId");
  const loadedOrderIdRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  
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
          form.setValue("toStreet1", order.shippingAddress.street1 || "");
          form.setValue("toStreet2", order.shippingAddress.street2 || "");
          form.setValue("toCity", order.shippingAddress.city || "");
          form.setValue("toState", order.shippingAddress.state || "");
          form.setValue("toZip", order.shippingAddress.zip || "");
          form.setValue("toCountry", order.shippingAddress.country || "US");
        } else {
          console.warn("No valid shipping address found in order");
        }
        
        // Set parcel dimensions and weight if available
        if (order.parcelInfo && Object.keys(order.parcelInfo).length > 0) {
          console.log("Setting parcel info from order:", order.parcelInfo);
          form.setValue("length", order.parcelInfo.length || 0);
          form.setValue("width", order.parcelInfo.width || 0);
          form.setValue("height", order.parcelInfo.height || 0);
          form.setValue("weight", order.parcelInfo.weight || 0);
        } else {
          console.warn("No valid parcel info found in order");
        }
        
        // Set order details
        form.setValue("orderId", order.id);
        form.setValue("requiredDeliveryDate", order.requiredDeliveryDate);
        
        toast.success("Order information loaded successfully");
        setOrderLookupComplete(true);
      } catch (error) {
        console.error("Error loading order from URL:", error);
        toast.error("Failed to load order information");
        loadedOrderIdRef.current = null; // Reset on error to allow retry
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    }
    
    loadOrderFromId();
  }, [orderIdFromUrl, form, setOrderLookupComplete]);
  
  // Reset the loaded order ref when orderIdFromUrl changes to a different order
  useEffect(() => {
    if (orderIdFromUrl !== loadedOrderIdRef.current && loadedOrderIdRef.current !== null) {
      loadedOrderIdRef.current = null;
      isLoadingRef.current = false;
    }
  }, [orderIdFromUrl]);
  
  return (
    <OrderLookupCard setOrderLookupComplete={setOrderLookupComplete} />
  );
};

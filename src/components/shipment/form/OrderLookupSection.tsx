
import { useState, useEffect } from "react";
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
  
  // Load order data if orderId is provided in the URL
  useEffect(() => {
    async function loadOrderFromId() {
      if (!orderIdFromUrl) return;
      
      try {
        setLoading(true);
        toast.info(`Loading order ${orderIdFromUrl}...`);
        
        // Set the orderBarcode field (which is what OrderLookupCard uses)
        form.setValue("orderBarcode", orderIdFromUrl);
        
        const order = await fetchOrderById(orderIdFromUrl);
        
        if (!order) {
          toast.error(`Order ${orderIdFromUrl} not found`);
          return;
        }
        
        console.log("Order loaded from URL:", order);
        
        // Update form with order data
        form.setValue("toName", order.customerName);
        form.setValue("toCompany", order.customerCompany || "");
        
        // Properly map shipping address fields from the order
        if (order.shippingAddress) {
          form.setValue("toStreet1", order.shippingAddress.street1);
          form.setValue("toStreet2", order.shippingAddress.street2 || "");
          form.setValue("toCity", order.shippingAddress.city);
          form.setValue("toState", order.shippingAddress.state);
          form.setValue("toZip", order.shippingAddress.zip);
          form.setValue("toCountry", order.shippingAddress.country);
        }
        
        form.setValue("toPhone", order.customerPhone || "");
        form.setValue("toEmail", order.customerEmail || "");
        
        // Set parcel dimensions and weight if available
        if (order.parcelInfo) {
          form.setValue("length", order.parcelInfo.length);
          form.setValue("width", order.parcelInfo.width);
          form.setValue("height", order.parcelInfo.height);
          form.setValue("weight", order.parcelInfo.weight);
        }
        
        // Set order details
        form.setValue("orderId", order.id);
        form.setValue("requiredDeliveryDate", order.requiredDeliveryDate);
        
        toast.success("Order information loaded");
        setOrderLookupComplete(true);
      } catch (error) {
        console.error("Error loading order from URL:", error);
        toast.error("Failed to load order information");
      } finally {
        setLoading(false);
      }
    }
    
    loadOrderFromId();
  }, [orderIdFromUrl, form, setOrderLookupComplete]);
  
  return (
    <OrderLookupCard setOrderLookupComplete={setOrderLookupComplete} />
  );
};

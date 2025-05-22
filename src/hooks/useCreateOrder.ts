
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { OrderFormValues } from "@/types/order";
import { createOrder } from "@/services/orderService";

export const useCreateOrder = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: OrderFormValues) => {
    setIsSubmitting(true);
    console.log("Order form data:", data);
    
    try {
      // Format the date for the API
      const formattedDate = data.requiredDeliveryDate.toISOString().split('T')[0];
      
      // Create the order
      const newOrder = await createOrder({
        customerName: data.customerName,
        customerCompany: data.customerCompany || undefined,
        customerEmail: data.customerEmail || undefined,
        customerPhone: data.customerPhone || undefined,
        orderDate: new Date().toISOString().split('T')[0], // Today's date
        requiredDeliveryDate: formattedDate,
        status: "processing",
        items: data.items,
        value: data.value,
        shippingAddress: {
          street1: data.street1,
          street2: data.street2 || undefined,
          city: data.city,
          state: data.state,
          zip: data.zip,
          country: data.country
        }
      });
      
      toast.success(`Order ${newOrder.id} created successfully!`);
      
      // Navigate back to orders page with highlight
      navigate(`/orders?highlight=${newOrder.id}`);
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    onSubmit,
  };
};

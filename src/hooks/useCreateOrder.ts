
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { OrderFormValues } from "@/types/order";

export const useCreateOrder = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: OrderFormValues) => {
    setIsSubmitting(true);
    console.log("Order form data:", data);
    
    try {
      // In a real app, you would save this to your database
      // For this example, we'll simulate a successful order creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create a new order ID (in real app, this would come from the backend)
      const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      
      toast.success(`Order ${orderId} created successfully!`);
      
      // Navigate back to orders page with highlight
      navigate(`/orders?highlight=${orderId}`);
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


import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { OrderFormValues } from "@/types/order";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context";

export const useUpdateOrder = (orderId: string) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const onSubmit = async (data: OrderFormValues) => {
    if (!user?.id) {
      toast.error("You must be logged in to update an order");
      return;
    }

    if (!data.warehouseId) {
      toast.error("Please select a warehouse");
      return;
    }

    setIsSubmitting(true);
    console.log("Updating order with data:", data);
    
    try {
      // Format the date for the API
      const formattedDate = data.requiredDeliveryDate.toISOString().split('T')[0];
      
      // Update the order in the database
      const { error } = await supabase
        .from('orders')
        .update({
          customer_name: data.customerName,
          customer_company: data.customerCompany || null,
          customer_email: data.customerEmail || null,
          customer_phone: data.customerPhone || null,
          required_delivery_date: formattedDate,
          items: [{ count: data.items, description: "Items" }],
          value: parseFloat(data.value) || 0,
          shipping_address: {
            street1: data.street1,
            street2: data.street2 || undefined,
            city: data.city,
            state: data.state,
            zip: data.zip,
            country: data.country
          },
          warehouse_id: data.warehouseId
        })
        .eq('order_id', orderId);
      
      if (error) {
        console.error("Error updating order:", error);
        toast.error("Failed to update order. Please try again.");
        return;
      }
      
      toast.success(`Order ${orderId} updated successfully!`);
      
      // Navigate back to orders page with highlight
      navigate(`/orders?highlight=${orderId}`);
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    onSubmit,
  };
};

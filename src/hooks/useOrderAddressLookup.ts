
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Address } from "@/types/easypost";
import { toast } from "sonner";
import { OrderFormValues } from "@/pages/CreateOrder";

export const useOrderAddressLookup = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useFormContext<OrderFormValues>();

  const handleSelectAddress = async (address: Address) => {
    try {
      setIsLoading(true);
      
      console.log('Selected address for order form:', address);
      
      // Fill in the form with the selected address
      form.setValue('street1', address.street1);
      form.setValue('street2', address.street2 || "");
      form.setValue('city', address.city);
      form.setValue('state', address.state);
      form.setValue('zip', address.zip);
      form.setValue('country', address.country);
      
      console.log('Form values set for shipping address:', {
        street1: address.street1,
        street2: address.street2,
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country
      });
      
      // Clear validation errors for the fields
      form.clearErrors('street1');
      form.clearErrors('city');
      form.clearErrors('state');
      form.clearErrors('zip');
      form.clearErrors('country');
      
      toast.success("Address added successfully");
      return true;
    } catch (error) {
      console.error("Error processing selected address:", error);
      toast.error("Failed to process selected address");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    handleSelectAddress
  };
};

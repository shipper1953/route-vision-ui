
import { useState } from "react";
import { toast } from "sonner";
import { useFormContext } from "react-hook-form";
import { Address } from "@/types/easypost";
import { ShipmentForm } from "@/types/shipment";
import easyPostService from "@/services/easypost";

export const useAddressLookup = (type: "from" | "to") => {
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useFormContext<ShipmentForm>();
  const prefix = type;

  const handleSelectAddress = async (address: Address) => {
    try {
      setIsLoading(true);
      
      console.log('Selected address for verification:', address);
      
      // Fill in the form with the selected address
      // Optionally verify with EasyPost if API key is available
      let verifiedAddress = address;
      
      if (import.meta.env.VITE_EASYPOST_API_KEY || import.meta.env.EASYPOST_API_KEY) {
        try {
          const verificationResult = await easyPostService.verifyAddress(address);
          if (verificationResult.verifications?.delivery.success) {
            verifiedAddress = verificationResult.address;
            toast.success("Address verified successfully");
          } else {
            toast.warning("Address could not be fully verified, using as provided");
          }
        } catch (error) {
          console.error("Error verifying address with EasyPost:", error);
          toast.warning("Address validation skipped, using as provided");
        }
      } else {
        console.log("EasyPost API key not available, skipping verification");
      }
      
      // Fill in the form with the address
      form.setValue(`${prefix}Street1`, verifiedAddress.street1);
      form.setValue(`${prefix}Street2`, verifiedAddress.street2 || "");
      form.setValue(`${prefix}City`, verifiedAddress.city);
      form.setValue(`${prefix}State`, verifiedAddress.state);
      form.setValue(`${prefix}Zip`, verifiedAddress.zip);
      form.setValue(`${prefix}Country`, verifiedAddress.country);
      
      console.log(`Form values set for ${prefix} address:`, {
        street1: verifiedAddress.street1,
        street2: verifiedAddress.street2,
        city: verifiedAddress.city,
        state: verifiedAddress.state,
        zip: verifiedAddress.zip,
        country: verifiedAddress.country
      });
      
      // Clear validation errors for the fields
      form.clearErrors(`${prefix}Street1`);
      form.clearErrors(`${prefix}City`);
      form.clearErrors(`${prefix}State`);
      form.clearErrors(`${prefix}Zip`);
      form.clearErrors(`${prefix}Country`);
      
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

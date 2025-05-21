
import { useState } from "react";
import { toast } from "sonner";
import { useFormContext } from "react-hook-form";
import { Address } from "@/types/easypost";
import { ShipmentForm } from "@/types/shipment";
import geoapifyService from "@/services/geoapify/geoapifyService";
import easyPostService from "@/services/easypost";

export const useAddressLookup = (type: "from" | "to") => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const form = useFormContext<ShipmentForm>();
  const prefix = type;

  const handleSearch = async () => {
    if (searchQuery.length < 3) {
      toast.warning("Please enter at least 3 characters to search");
      return;
    }
    
    setIsLoading(true);
    setResults([]);
    setSearchError(null);
    
    try {
      console.log('Starting address lookup with query:', searchQuery);
      
      // Use Geoapify service for address lookup
      const addresses = await geoapifyService.searchAddresses(searchQuery);
      
      console.log('Address lookup results:', addresses);
      setResults(addresses);
      
      if (addresses.length === 0) {
        setSearchError("No addresses found. Try a different search term.");
        toast.info("No addresses found. Try a different search term.");
      }
    } catch (error) {
      console.error("Error looking up address:", error);
      setSearchError("Failed to look up address. Please try again.");
      toast.error("Failed to look up address. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
    searchQuery,
    setSearchQuery,
    results,
    isLoading,
    searchError,
    handleSearch,
    handleSelectAddress
  };
};

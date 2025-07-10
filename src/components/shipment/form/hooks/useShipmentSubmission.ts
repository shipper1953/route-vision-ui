
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { ShipmentForm } from "@/types/shipment";
import { ShipmentResponse, SmartRate, Rate } from "@/services/easypost";
import easyPostService from "@/services/easypost";
import { validatePackageDimensions } from "../helpers/formValidation";
import { buildShipmentData } from "../helpers/shipmentDataBuilder";
import { findRecommendedRateByDate, findMostEconomicalRate } from "../helpers/rateSelectionHelpers";
import { useAuth } from "@/context";
import { supabase } from "@/integrations/supabase/client";

interface UseShipmentSubmissionProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onShipmentCreated: (response: ShipmentResponse, selectedRate: SmartRate | Rate | null) => void;
}

export const useShipmentSubmission = ({ 
  loading, 
  setLoading, 
  onShipmentCreated 
}: UseShipmentSubmissionProps) => {
  const form = useFormContext<ShipmentForm>();
  const { userProfile } = useAuth();

  const handleFormSubmit = async () => {
    try {
      const data = form.getValues();
      console.log("Form submitted with data:", data);
      console.log("User profile during submission:", userProfile);
      
      // Validate package dimensions and weight
      if (!validatePackageDimensions(data)) {
        return;
      }
      
      setLoading(true);
      toast.info("Getting shipping rates...");
      
      const shipmentData = buildShipmentData(data);
      console.log("Creating shipment with data:", shipmentData);
      console.log("User company_id:", userProfile?.company_id);
      
      // DIAGNOSTIC: Test environment variables first
      console.log("🔍 Running environment diagnostics...");
      try {
        const { data: debugData, error: debugError } = await supabase.functions.invoke('debug-env');
        if (debugData) {
          console.log("🔍 Environment diagnostic results:", debugData);
        } else {
          console.error("🔍 Debug function failed:", debugError);
        }
      } catch (debugErr) {
        console.error("🔍 Could not run diagnostics:", debugErr);
      }
      
      const response = await easyPostService.createShipment(shipmentData);
      
      // Store the shipment ID and user context in the form
      form.setValue("shipmentId", response.id);
      
      if (!response.rates?.length && !response.smartRates?.length) {
        toast.error("No shipping rates available. Please check your package dimensions and try again.");
        return;
      }
      
      // Find recommended rate based on required delivery date
      let recommendedRate = null;
      
      console.log("Required delivery date from form:", data.requiredDeliveryDate);
      
      if (data.requiredDeliveryDate) {
        console.log("Finding rate for required delivery date:", data.requiredDeliveryDate);
        recommendedRate = findRecommendedRateByDate(response, data.requiredDeliveryDate);
      } else {
        console.log("No required delivery date, finding most economical rate");
        recommendedRate = findMostEconomicalRate(response);
      }
      
      toast.success("Shipment rates retrieved successfully");
      onShipmentCreated(response, recommendedRate);
    } catch (error) {
      console.error("Error creating shipment:", error);
      
      // Show more specific error message from EasyPost if available
      if (error instanceof Error && error.message.includes('EasyPost')) {
        toast.error(error.message);
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to retrieve shipment rates. Please check your package dimensions and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return { handleFormSubmit };
};

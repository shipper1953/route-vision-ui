import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { ShipmentForm } from "@/types/shipment";
import { ShipmentResponse, SmartRate, Rate } from "@/services/easypost";
import { RateShoppingService, CombinedRateResponse } from "@/services/rateShoppingService";
import { validatePackageDimensions } from "../helpers/formValidation";
import { buildShipmentData } from "../helpers/shipmentDataBuilder";
import { findRecommendedRateByDate, findMostEconomicalRate } from "../helpers/rateSelectionHelpers";
import { useAuth } from "@/context";
import { supabase } from "@/integrations/supabase/client";
import { recommendRate } from "@/services/shipping/rateSelection";
import { logEvent } from "@/services/shipping/analytics";
interface UseShipmentSubmissionProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onShipmentCreated: (response: CombinedRateResponse, selectedRate: SmartRate | Rate | null, selectedBoxData?: any) => void;
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
      toast.info("Getting shipping rates from multiple providers...");
      
      const shipmentData = buildShipmentData(data);
      console.log("Built shipment data:", shipmentData);
      console.log("Selected box info from form:", {
        selectedBoxId: data.selectedBoxId,
        selectedBoxSku: data.selectedBoxSku, 
        selectedBoxName: data.selectedBoxName,
        selectedBoxes: data.selectedBoxes
      });
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
      
      // Use the new rate shopping service to get rates from multiple providers
      const rateShoppingService = new RateShoppingService();
      const response = await rateShoppingService.getRatesFromAllProviders(shipmentData);
      
      // Store the shipment ID and user context in the form
      form.setValue("shipmentId", response.id);
      
      if (!response.rates?.length && !response.smartRates?.length) {
        toast.error("No shipping rates available from any provider. Please check your package dimensions and try again.");
        return;
      }
      
      // Recommend a rate using company SLA prefs and rules
      const totalRates = response.rates.length + (response.smartRates?.length || 0);
      const easyPostCount = response.rates.filter(r => r.provider === 'easypost').length;
      const shippoCount = response.rates.filter(r => r.provider === 'shippo').length;

      await logEvent('rates_shopped', {
        response_id: response.id,
        totalRates,
        easyPostCount,
        shippoCount,
        orderId: data.orderId || null,
        requiredDeliveryDate: data.requiredDeliveryDate || null,
      });

      let recommendedRate: any = await recommendRate(response as any, data.requiredDeliveryDate || null);

      // Fallback to existing helpers if no recommendation found
      if (!recommendedRate) {
        if (data.requiredDeliveryDate) {
          recommendedRate = findRecommendedRateByDate(response as any, data.requiredDeliveryDate);
        } else {
          recommendedRate = findMostEconomicalRate(response as any);
        }
      }

      await logEvent('rate_recommended', {
        response_id: response.id,
        rate: recommendedRate ? {
          id: recommendedRate.id,
          provider: recommendedRate.provider,
          carrier: recommendedRate.carrier,
          service: recommendedRate.service,
          rate: recommendedRate.rate,
          delivery_days: recommendedRate.delivery_days ?? null,
        } : null,
      });

      // Store selected box information from form context  
      const selectedBoxData = {
        selectedBoxId: data.selectedBoxId,
        selectedBoxSku: data.selectedBoxSku || data.selectedBoxName, // Use name as fallback for SKU
        selectedBoxName: data.selectedBoxName,
        selectedBoxes: data.selectedBoxes
      };

      toast.success(`Found ${totalRates} rates from multiple providers (EasyPost: ${easyPostCount}, Shippo: ${shippoCount})`);
      onShipmentCreated(response, recommendedRate as any, selectedBoxData);
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

import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { ShipmentForm } from "@/types/shipment";
import { ShipmentResponse, SmartRate, Rate } from "@/services/easypost";
import { RateShoppingService, CombinedRateResponse } from "@/services/rateShoppingService";
import { validatePackageDimensions } from "../helpers/formValidation";
import { buildShipmentData } from "../helpers/shipmentDataBuilder";
import { findRecommendedRateByDate, findMostEconomicalRate } from "../helpers/rateSelectionHelpers";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { recommendRate } from "@/services/shipping/rateSelection";
import { logEvent } from "@/services/shipping/analytics";
import { SelectedItem } from "@/types/fulfillment";

interface UseShipmentSubmissionProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  selectedItems?: SelectedItem[];
  onShipmentCreated: (response: CombinedRateResponse, selectedRate: SmartRate | Rate | null, selectedBoxData?: any) => void;
}

export const useShipmentSubmission = ({ 
  loading, 
  setLoading,
  selectedItems,
  onShipmentCreated 
}: UseShipmentSubmissionProps) => {
  const form = useFormContext<ShipmentForm>();
  const { userProfile } = useAuth();

  const handleFormSubmit = async () => {
    try {
      const data = form.getValues();
      console.log("📋 Form submitted with data:", data);
      console.log("👤 User profile during submission:", userProfile);
      
      // CRITICAL VALIDATION: Ensure items are selected when order is linked
      if (data.orderId) {
        if (!selectedItems || selectedItems.length === 0) {
          console.error("❌ No items selected for order:", data.orderId);
          toast.error("Please wait for items to load or select at least one item to ship");
          setLoading(false);
          return;
        }
        
        // Validate at least one item with dimensions
        const itemsWithDimensions = selectedItems.filter(item => item.dimensions);
        if (itemsWithDimensions.length === 0) {
          toast.error('Cannot create shipment: No items have dimensions. Please add dimensions to items in Item Master.');
          setLoading(false);
          return;
        }
        
        console.log("✅ Selected items validation passed:", selectedItems.length, "items");
      }
      
      console.log("📦 Selected items for shipment:", selectedItems);
      
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

      // CRITICAL: Build selectedBoxData with selectedItems - this is required for partial fulfillment tracking
      if (!selectedItems || selectedItems.length === 0) {
        console.error("❌ CRITICAL: selectedItems is empty when building selectedBoxData!");
        toast.error("Unable to process shipment: items not selected");
        setLoading(false);
        return;
      }

      console.log("📦 Building selectedBoxData with", selectedItems.length, "items");

      const selectedBoxData = {
        selectedBoxId: data.selectedBoxId,
        selectedBoxSku: data.selectedBoxSku || data.selectedBoxName,
        selectedBoxName: data.selectedBoxName,
        selectedBoxes: data.selectedBoxes,
        selectedItems: selectedItems, // CRITICAL: This must be populated
        packageMetadata: {
          packageIndex: 0,
          items: selectedItems, // CRITICAL: This must be populated
          boxData: {
            name: data.selectedBoxName || 'Unknown',
            length: data.length || 0,
            width: data.width || 0,
            height: data.height || 0
          },
          weight: data.weight || 0
        }
      };

      console.log("✅ Built selectedBoxData successfully:", {
        hasSelectedItems: !!selectedBoxData.selectedItems,
        selectedItemsCount: selectedBoxData.selectedItems?.length || 0,
        hasPackageMetadata: !!selectedBoxData.packageMetadata,
        packageMetadataItemsCount: selectedBoxData.packageMetadata?.items?.length || 0
      });

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

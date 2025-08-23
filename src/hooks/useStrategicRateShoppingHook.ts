import { useState, useCallback } from "react";
import { 
  StrategicRateShoppingService, 
  EnhancedShipmentData, 
  EnhancedRateResponse,
  EnhancedQuote 
} from "@/services/strategicRateShoppingService";
import { useAuth } from "@/context";
import { toast } from "sonner";

export const useStrategicRateShopping = () => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rateResponse, setRateResponse] = useState<EnhancedRateResponse | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<EnhancedQuote | null>(null);

  const strategicService = new StrategicRateShoppingService();

  const getStrategicRates = useCallback(async (shipmentData: Omit<EnhancedShipmentData, 'company_id' | 'user_id'>) => {
    if (!userProfile?.company_id || !userProfile?.id) {
      toast.error("User profile not loaded");
      return null;
    }

    setLoading(true);
    try {
      const fullShipmentData: EnhancedShipmentData = {
        ...shipmentData,
        company_id: userProfile.company_id,
        user_id: userProfile.id
      };

      console.log('🎯 Initiating strategic rate shopping...', {
        packages: fullShipmentData.packages.length,
        totalWeight: fullShipmentData.packages.reduce((sum, pkg) => sum + pkg.weight, 0),
        from: fullShipmentData.from_address.city,
        to: fullShipmentData.to_address.city
      });

      const response = await strategicService.getStrategicRates(fullShipmentData);
      setRateResponse(response);
      
      // Auto-select the cheapest option
      if (response.cheapest_option) {
        setSelectedQuote(response.cheapest_option);
      }

      const analysis = strategicService.analyzeShipmentComplexity(fullShipmentData.packages);
      
      toast.success(
        `Found ${response.total_options} rates using ${analysis.complexity} strategy. ` +
        `Best rate: $${response.cheapest_option?.rate.toFixed(2) || '0.00'}`
      );

      return response;
    } catch (error) {
      console.error('Strategic rate shopping failed:', error);
      toast.error(error instanceof Error ? error.message : "Failed to get shipping rates");
      return null;
    } finally {
      setLoading(false);
    }
  }, [userProfile, strategicService]);

  const selectQuote = useCallback(async (quote: EnhancedQuote) => {
    if (!rateResponse?.shipment_id) {
      toast.error("No shipment to select quote for");
      return false;
    }

    try {
      // In a real implementation, you'd call the service to mark the quote as selected
      // await strategicService.selectQuote(rateResponse.shipment_id, quoteId);
      
      setSelectedQuote(quote);
      toast.success(`Selected ${quote.carrier.toUpperCase()} ${quote.service} for $${quote.rate.toFixed(2)}`);
      return true;
    } catch (error) {
      console.error('Failed to select quote:', error);
      toast.error("Failed to select rate");
      return false;
    }
  }, [rateResponse?.shipment_id]);

  const getShipmentAnalysis = useCallback((packages: any[]) => {
    return strategicService.analyzeShipmentComplexity(packages);
  }, [strategicService]);

  const calculateSavings = useCallback(() => {
    if (!rateResponse?.quotes) return 0;
    return strategicService.calculateStrategicSavings(rateResponse.quotes);
  }, [rateResponse?.quotes, strategicService]);

  const reset = useCallback(() => {
    setRateResponse(null);
    setSelectedQuote(null);
  }, []);

  return {
    // State
    loading,
    rateResponse,
    selectedQuote,
    
    // Actions
    getStrategicRates,
    selectQuote,
    reset,
    
    // Analysis
    getShipmentAnalysis,
    calculateSavings,
    
    // Computed values
    hasRates: !!rateResponse?.quotes?.length,
    totalOptions: rateResponse?.total_options || 0,
    cheapestRate: rateResponse?.cheapest_option?.rate || 0,
    selectedRate: selectedQuote?.rate || 0,
    strategyUsed: rateResponse?.strategy_used || { parcel: false, freight: false, hybrid: false }
  };
};
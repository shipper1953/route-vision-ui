
import { 
  Card, 
  CardContent
} from "@/components/ui/card";
import { SmartRate, Rate } from "@/services/easypost";
import { CombinedRateResponse } from "@/services/rateShoppingService";
import { ShippingRatesCardHeader } from "./ShippingRatesCardHeader";
import { RatesList } from "./RatesList";
import { ShippingRatesCardFooter } from "./ShippingRatesCardFooter";
import { useFormContext } from "react-hook-form";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Company, CompanyAddress } from "@/types/auth";
import { applyMarkupToRates, MarkedUpRate, MarkedUpSmartRate } from "@/utils/rateMarkupUtils";

interface ShippingRatesCardProps {
  shipmentResponse: CombinedRateResponse;
  selectedRate: SmartRate | Rate | null;
  setSelectedRate: (rate: SmartRate | Rate | null) => void;
  recommendedRate: SmartRate | Rate | null;
  onBack: () => void;
  onBuyLabel: (shipmentId: string, rateId: string) => Promise<any>;
}

// Transform database company data to our Company type
const transformCompanyData = (dbCompany: any): Company => {
  return {
    id: dbCompany.id,
    name: dbCompany.name,
    email: dbCompany.email,
    phone: dbCompany.phone,
    address: dbCompany.address as CompanyAddress | undefined,
    settings: dbCompany.settings,
    created_at: dbCompany.created_at,
    updated_at: dbCompany.updated_at,
    is_active: dbCompany.is_active,
    markup_type: (dbCompany.markup_type as 'percentage' | 'fixed') || 'percentage',
    markup_value: dbCompany.markup_value || 0
  };
};

export const ShippingRatesCard = ({ 
  shipmentResponse, 
  selectedRate, 
  setSelectedRate, 
  recommendedRate,
  onBack,
  onBuyLabel
}: ShippingRatesCardProps) => {
  const { userProfile } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [markedUpRates, setMarkedUpRates] = useState<(MarkedUpRate | MarkedUpSmartRate)[]>([]);
  
  // Get form context from parent component
  const form = useFormContext();
  
  // Debug log to see what's coming back from the API
  console.log("ShippingRatesCard received response:", shipmentResponse);
  console.log("Available smartrates:", shipmentResponse?.smartRates?.length || 0);
  console.log("Available rates:", shipmentResponse?.rates?.length || 0);
  console.log("EasyPost rates:", shipmentResponse?.rates?.filter(r => r.provider === 'easypost').length || 0);
  console.log("Shippo rates:", shipmentResponse?.rates?.filter(r => r.provider === 'shippo').length || 0);
  
  // Use either smartrates or regular rates (fallback) if available
  const availableRates = shipmentResponse?.smartRates?.length ? 
    shipmentResponse.smartRates : 
    (shipmentResponse?.rates?.length ? shipmentResponse.rates : []);

  // Fetch company data for markup calculation
  useEffect(() => {
    const fetchCompany = async () => {
      if (!userProfile?.company_id) return;
      
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', userProfile.company_id)
          .single();

        if (error) throw error;
        
        // Transform the database data to match our Company type
        const transformedCompany = transformCompanyData(data);
        setCompany(transformedCompany);
      } catch (error) {
        console.error('Error fetching company for markup calculation:', error);
      }
    };

    fetchCompany();
  }, [userProfile?.company_id]);

  // Apply markup to rates when company data or rates change
  useEffect(() => {
    if (availableRates.length > 0) {
      const ratesWithMarkup = applyMarkupToRates(availableRates, company);
      setMarkedUpRates(ratesWithMarkup);
      console.log('Applied markup to rates:', ratesWithMarkup);
    }
  }, [availableRates, company]);

  // Alert user if no rates are available and ensure selected rate is marked up
  useEffect(() => {
    if (!availableRates.length) {
      toast.error("No shipping rates available. Please check the shipping details and try again.");
    } else if (markedUpRates.length > 0) {
      // If we have a selected rate that doesn't have markup applied, replace it with the marked up version
      if (selectedRate && !('original_rate' in selectedRate)) {
        const markedUpVersion = markedUpRates.find(rate => rate.id === selectedRate.id);
        if (markedUpVersion) {
          console.log('Replacing original rate with marked up version:', markedUpVersion);
          setSelectedRate(markedUpVersion);
        }
      }
      // If we have rates and a recommended rate is available but not selected, select it
      else if (recommendedRate && !selectedRate) {
        // Find the marked up version of the recommended rate
        const markedUpRecommended = markedUpRates.find(rate => rate.id === recommendedRate.id);
        if (markedUpRecommended) {
          setSelectedRate(markedUpRecommended);
        }
      }
    }
  }, [availableRates.length, recommendedRate, selectedRate, setSelectedRate, markedUpRates]);
  
  // If there's no form context, render without FormProvider
  return (
    <Card>
      <ShippingRatesCardHeader />
      
      <CardContent>
        {markedUpRates.length > 0 ? (
          <RatesList 
            rates={markedUpRates as (SmartRate | Rate)[]}
            selectedRate={selectedRate}
            recommendedRate={recommendedRate}
            setSelectedRate={setSelectedRate}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No shipping rates available from any provider
            {shipmentResponse.id && (
              <p className="mt-2 text-xs">Combined response (ID: {shipmentResponse.id}), but no rates were returned.</p>
            )}
          </div>
        )}
      </CardContent>
      
      <ShippingRatesCardFooter 
        shipmentResponse={shipmentResponse}
        selectedRate={selectedRate}
        onBack={onBack}
        onBuyLabel={onBuyLabel}
      />
    </Card>
  );
};

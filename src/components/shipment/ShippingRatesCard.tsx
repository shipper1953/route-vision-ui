
import { 
  Card, 
  CardContent
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { AlertTriangle, Zap, DollarSign, Star } from "lucide-react";

interface ShippingRatesCardProps {
  shipmentResponse: CombinedRateResponse;
  selectedRate: SmartRate | Rate | null;
  setSelectedRate: (rate: SmartRate | Rate | null) => void;
  recommendedRate: SmartRate | Rate | null;
  onBack: () => void;
  onBuyLabel: (shipmentId: string, rateId: string) => Promise<any>;
}

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
  
  const form = useFormContext();
  const decisionMetadata = shipmentResponse?.decisionMetadata;
  const ranked = decisionMetadata?.rankedRecommendations;
  
  const availableRates = shipmentResponse?.smartRates?.length ? 
    shipmentResponse.smartRates : 
    (shipmentResponse?.rates?.length ? shipmentResponse.rates : []);

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
        setCompany(transformCompanyData(data));
      } catch (error) {
        console.error('Error fetching company for markup calculation:', error);
      }
    };
    fetchCompany();
  }, [userProfile?.company_id]);

  useEffect(() => {
    if (availableRates.length > 0) {
      const ratesWithMarkup = applyMarkupToRates(availableRates, company);
      setMarkedUpRates(ratesWithMarkup);
      if (selectedRate && !('original_rate' in selectedRate)) {
        const markedUpVersion = ratesWithMarkup.find(rate => rate.id === selectedRate.id);
        if (markedUpVersion) setSelectedRate(markedUpVersion);
      }
    }
  }, [availableRates, company, selectedRate, setSelectedRate]);

  useEffect(() => {
    if (!availableRates.length) {
      toast.error("No shipping rates available. Please check the shipping details and try again.");
    } else if (markedUpRates.length > 0) {
      if (selectedRate && !('original_rate' in selectedRate)) {
        const markedUpVersion = markedUpRates.find(rate => rate.id === selectedRate.id);
        if (markedUpVersion) setSelectedRate(markedUpVersion);
      } else if (recommendedRate && !selectedRate) {
        const markedUpRecommended = markedUpRates.find(rate => rate.id === recommendedRate.id);
        if (markedUpRecommended) setSelectedRate(markedUpRecommended);
      }
    }
  }, [availableRates.length, recommendedRate, selectedRate, setSelectedRate, markedUpRates]);
  
  return (
    <Card>
      <ShippingRatesCardHeader />
      
      <CardContent className="space-y-4">
        {/* Degraded mode warning */}
        {decisionMetadata?.degradedMode && (
          <Alert className="border-yellow-500 bg-yellow-50 text-yellow-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Degraded mode:</span> {decisionMetadata.degradedProviders.join(', ')} unavailable. 
              Rates shown are from available providers only.
            </AlertDescription>
          </Alert>
        )}

        {/* Ranked recommendation quick-select badges */}
        {ranked && (ranked.cheapest || ranked.fastest || ranked.bestValue) && (
          <div className="flex flex-wrap gap-2">
            {ranked.cheapest && (
              <Badge 
                variant="outline" 
                className="cursor-pointer border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                onClick={() => {
                  const rate = markedUpRates.find(r => r.id === ranked.cheapest?.rateId);
                  if (rate) setSelectedRate(rate);
                }}
              >
                <DollarSign className="h-3 w-3 mr-1" />
                Cheapest: {ranked.cheapest.carrier} ${ranked.cheapest.rate.toFixed(2)}
              </Badge>
            )}
            {ranked.fastest && (
              <Badge 
                variant="outline" 
                className="cursor-pointer border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                onClick={() => {
                  const rate = markedUpRates.find(r => r.id === ranked.fastest?.rateId);
                  if (rate) setSelectedRate(rate);
                }}
              >
                <Zap className="h-3 w-3 mr-1" />
                Fastest: {ranked.fastest.carrier} {ranked.fastest.estimatedDays ? `${ranked.fastest.estimatedDays}d` : ''}
              </Badge>
            )}
            {ranked.bestValue && (
              <Badge 
                variant="outline" 
                className="cursor-pointer border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100"
                onClick={() => {
                  const rate = markedUpRates.find(r => r.id === ranked.bestValue?.rateId);
                  if (rate) setSelectedRate(rate);
                }}
              >
                <Star className="h-3 w-3 mr-1" />
                Best Value: {ranked.bestValue.carrier} ${ranked.bestValue.rate.toFixed(2)}
              </Badge>
            )}
          </div>
        )}

        {markedUpRates.length > 0 ? (
          <RatesList 
            rates={markedUpRates as (SmartRate | Rate)[]}
            selectedRate={selectedRate}
            recommendedRate={recommendedRate}
            setSelectedRate={setSelectedRate}
            rankedRecommendations={ranked}
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

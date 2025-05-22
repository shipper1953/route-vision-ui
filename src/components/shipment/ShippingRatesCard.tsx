
import { 
  Card, 
  CardContent
} from "@/components/ui/card";
import { ShipmentResponse, SmartRate } from "@/services/easypost";
import { ShippingRatesCardHeader } from "./ShippingRatesCardHeader";
import { RatesList } from "./RatesList";
import { ShippingRatesCardFooter } from "./ShippingRatesCardFooter";
import { FormProvider, useFormContext } from "react-hook-form";

interface ShippingRatesCardProps {
  shipmentResponse: ShipmentResponse;
  selectedRate: SmartRate | null;
  setSelectedRate: (rate: SmartRate | null) => void;
  recommendedRate: SmartRate | null;
  onBack: () => void;
}

export const ShippingRatesCard = ({ 
  shipmentResponse, 
  selectedRate, 
  setSelectedRate, 
  recommendedRate,
  onBack 
}: ShippingRatesCardProps) => {
  // Get form context from parent component
  const form = useFormContext();
  
  // If there's no form context, render without FormProvider
  if (!form) {
    return (
      <Card>
        <ShippingRatesCardHeader />
        
        <CardContent>
          {shipmentResponse.smartrates && shipmentResponse.smartrates.length > 0 ? (
            <RatesList 
              rates={shipmentResponse.smartrates}
              selectedRate={selectedRate}
              recommendedRate={recommendedRate}
              setSelectedRate={setSelectedRate}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No shipping rates available
            </div>
          )}
        </CardContent>
        
        <ShippingRatesCardFooter 
          selectedRate={selectedRate}
          onBack={onBack}
        />
      </Card>
    );
  }
  
  // If form context exists, use it directly
  return (
    <Card>
      <ShippingRatesCardHeader />
      
      <CardContent>
        {shipmentResponse.smartrates && shipmentResponse.smartrates.length > 0 ? (
          <RatesList 
            rates={shipmentResponse.smartrates}
            selectedRate={selectedRate}
            recommendedRate={recommendedRate}
            setSelectedRate={setSelectedRate}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No shipping rates available
          </div>
        )}
      </CardContent>
      
      <ShippingRatesCardFooter 
        selectedRate={selectedRate}
        onBack={onBack}
      />
    </Card>
  );
};


import { 
  Card, 
  CardContent
} from "@/components/ui/card";
import { ShipmentResponse, SmartRate, Rate } from "@/services/easypost";
import { ShippingRatesCardHeader } from "./ShippingRatesCardHeader";
import { RatesList } from "./RatesList";
import { ShippingRatesCardFooter } from "./ShippingRatesCardFooter";
import { FormProvider, useFormContext } from "react-hook-form";
import { useEffect } from "react";
import { toast } from "sonner";

interface ShippingRatesCardProps {
  shipmentResponse: ShipmentResponse;
  selectedRate: SmartRate | Rate | null;
  setSelectedRate: (rate: SmartRate | Rate | null) => void;
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
  
  // Debug log to see what's coming back from the API
  console.log("ShippingRatesCard received response:", shipmentResponse);
  console.log("Available smartrates:", shipmentResponse?.smartrates?.length || 0);
  console.log("Available rates:", shipmentResponse?.rates?.length || 0);
  
  // Use either smartrates or regular rates (fallback) if available
  const availableRates = shipmentResponse?.smartrates?.length ? 
    shipmentResponse.smartrates : 
    (shipmentResponse?.rates?.length ? shipmentResponse.rates : []);

  // Alert user if no rates are available
  useEffect(() => {
    if (!availableRates.length) {
      toast.error("No shipping rates available. Please check the shipping details and try again.");
    }
  }, [availableRates.length]);
  
  // If there's no form context, render without FormProvider
  if (!form) {
    return (
      <Card>
        <ShippingRatesCardHeader />
        
        <CardContent>
          {availableRates.length > 0 ? (
            <RatesList 
              rates={availableRates}
              selectedRate={selectedRate}
              recommendedRate={recommendedRate}
              setSelectedRate={setSelectedRate}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No shipping rates available
              {shipmentResponse.id && (
                <p className="mt-2 text-xs">Shipment created (ID: {shipmentResponse.id}), but no rates were returned.</p>
              )}
            </div>
          )}
        </CardContent>
        
        <ShippingRatesCardFooter 
          selectedRate={selectedRate}
          onBack={onBack}
          shipmentId={shipmentResponse.id} // Pass shipment ID from response
        />
      </Card>
    );
  }
  
  // If form context exists, use it directly
  return (
    <Card>
      <ShippingRatesCardHeader />
      
      <CardContent>
        {availableRates.length > 0 ? (
          <RatesList 
            rates={availableRates}
            selectedRate={selectedRate}
            recommendedRate={recommendedRate}
            setSelectedRate={setSelectedRate}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No shipping rates available
            {shipmentResponse.id && (
              <p className="mt-2 text-xs">Shipment created (ID: {shipmentResponse.id}), but no rates were returned.</p>
            )}
          </div>
        )}
      </CardContent>
      
      <ShippingRatesCardFooter 
        selectedRate={selectedRate}
        onBack={onBack}
        shipmentId={shipmentResponse.id} // Pass shipment ID from response
      />
    </Card>
  );
};

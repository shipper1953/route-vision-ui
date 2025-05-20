
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Package, Truck } from "lucide-react";
import { ShipmentForm } from "@/types/shipment";
import { ShipmentResponse, SmartRate } from "@/services/easypostService";

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
  const form = useFormContext<ShipmentForm>();
  
  const handlePurchaseLabel = () => {
    if (!selectedRate) {
      toast.error("Please select a shipping rate first");
      return;
    }
    
    const orderId = form.getValues("orderId");
    
    toast.success("Shipping label purchased successfully!");
    // In a production implementation:
    // 1. Call the EasyPost API to purchase the label
    // 2. Update the order status
    // 3. Associate the shipment with the order
    
    // Navigate back to Orders page after short delay
    setTimeout(() => {
      window.location.href = orderId ? `/orders?highlight=${orderId}` : "/orders";
    }, 2000);
  };
  
  const getDeliveryAccuracyLabel = (accuracy?: string) => {
    switch (accuracy) {
      case 'percentile_50':
        return '50%';
      case 'percentile_75':
        return '75%';
      case 'percentile_85':
        return '85%';
      case 'percentile_90':
        return '90%';
      case 'percentile_95':
        return '95%';
      case 'percentile_97':
        return '97%';
      case 'percentile_99':
        return '99%';
      default:
        return '--';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping Rates</CardTitle>
        <CardDescription>
          Select a shipping rate to continue. SmartRate provides estimated transit times and delivery accuracy.
          {form.getValues("requiredDeliveryDate") && (
            <span className="block mt-1 font-medium">
              Required delivery date: {new Date(form.getValues("requiredDeliveryDate")).toLocaleDateString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {shipmentResponse.smartrates?.map((rate) => (
            <div
              key={rate.id}
              className={`p-4 border rounded-md flex flex-col md:flex-row justify-between items-start md:items-center transition-colors cursor-pointer ${
                selectedRate?.id === rate.id 
                  ? 'border-tms-blue bg-blue-50' 
                  : recommendedRate?.id === rate.id
                  ? 'border-green-400 bg-green-50'
                  : 'border-border hover:bg-muted/50'
              }`}
              onClick={() => setSelectedRate(rate)}
            >
              <div className="flex items-center gap-3 mb-3 md:mb-0">
                <div className={`h-5 w-5 rounded-full ${
                  selectedRate?.id === rate.id 
                    ? 'bg-tms-blue' 
                    : 'border border-muted-foreground'
                }`}>
                  {selectedRate?.id === rate.id && (
                    <div className="h-full w-full flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white"></div>
                    </div>
                  )}
                </div>
                
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    {rate.carrier} {rate.service}
                    {recommendedRate?.id === rate.id && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Delivery in {rate.delivery_days} business day{rate.delivery_days !== 1 && 's'} 
                    {rate.delivery_date && ` - Est. delivery ${new Date(rate.delivery_date).toLocaleDateString()}`}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                  <div className="font-medium">
                    {getDeliveryAccuracyLabel(rate.delivery_accuracy)}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Guaranteed</div>
                  <div className="font-medium">
                    {rate.delivery_date_guaranteed ? 'Yes' : 'No'}
                  </div>
                </div>
                
                <div className="text-right font-bold text-lg text-tms-blue">
                  ${rate.rate}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
        >
          Back to Shipment Details
        </Button>
        
        <Button 
          className="bg-tms-blue hover:bg-tms-blue-400"
          disabled={!selectedRate}
          onClick={handlePurchaseLabel}
        >
          <Package className="mr-2 h-4 w-4" />
          Purchase Label
        </Button>
      </CardFooter>
    </Card>
  );
};

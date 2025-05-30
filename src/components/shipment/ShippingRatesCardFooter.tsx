
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ArrowLeft, Package, Download } from "lucide-react";
import { ShipmentResponse, SmartRate, Rate } from "@/services/easypost";
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";
import { toast } from "sonner";
import { linkShipmentToOrder } from "@/services/orderService";

interface ShippingRatesCardFooterProps {
  shipmentResponse: ShipmentResponse;
  selectedRate: SmartRate | Rate | null;
  onBack: () => void;
  onBuyLabel: (shipmentId: string, rateId: string) => Promise<any>;
}

export const ShippingRatesCardFooter = ({ 
  shipmentResponse, 
  selectedRate, 
  onBack,
  onBuyLabel
}: ShippingRatesCardFooterProps) => {
  const [purchasing, setPurchasing] = useState(false);
  const form = useFormContext<ShipmentForm>();
  
  // Safely get orderID from form context if available
  const orderId = form?.getValues ? form.getValues("orderId") : undefined;
  
  const handlePurchaseLabel = async () => {
    if (!selectedRate) {
      toast.error("Please select a shipping rate first");
      return;
    }
    
    if (!shipmentResponse.id) {
      toast.error("Missing shipment ID");
      return;
    }
    
    setPurchasing(true);
    try {
      console.log(`Purchasing label for shipment ${shipmentResponse.id} with rate ${selectedRate.id}`);
      const result = await onBuyLabel(shipmentResponse.id, selectedRate.id);
      
      // Don't show toast here since we'll be showing the dialog
      // The dialog will be triggered by the parent component
      
    } catch (error) {
      console.error("Error purchasing label:", error);
      toast.error("Failed to purchase shipping label");
    } finally {
      setPurchasing(false);
    }
  };
  
  return (
    <div className="flex justify-between items-center mt-6 pt-4 border-t">
      <Button variant="ghost" onClick={onBack} className="gap-1">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>
      <Button 
        onClick={handlePurchaseLabel}
        disabled={!selectedRate || purchasing} 
        className={purchasing ? "bg-transparent hover:bg-transparent border-transparent" : "bg-tms-blue hover:bg-tms-blue-400 gap-1"}
      >
        {purchasing ? (
          <LoadingSpinner size={100} className="[&>span]:hidden [&>div]:bg-transparent tornado-360-spin" />
        ) : (
          <>
            <Package className="w-4 h-4" />
            Buy Label
            {selectedRate && <span className="ml-1">${parseFloat(selectedRate.rate).toFixed(2)}</span>}
          </>
        )}
      </Button>
    </div>
  );
};


import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { SmartRate } from "@/services/easypostService";
import { toast } from "sonner";
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";

interface ShippingRatesCardFooterProps {
  selectedRate: SmartRate | null;
  onBack: () => void;
}

export const ShippingRatesCardFooter = ({ 
  selectedRate, 
  onBack 
}: ShippingRatesCardFooterProps) => {
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
  
  return (
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
  );
};

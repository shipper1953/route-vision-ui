
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ArrowLeft, Package, Download, AlertTriangle } from "lucide-react";
import { SmartRate, Rate } from "@/services/easypost";
import { CombinedRateResponse } from "@/services/rateShoppingService";
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";
import { toast } from "sonner";
import { linkShipmentToOrder } from "@/services/orderService";
import { useAuth } from "@/context";
import { supabase } from "@/integrations/supabase/client";

interface ShippingRatesCardFooterProps {
  shipmentResponse: CombinedRateResponse;
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
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [hasSufficientFunds, setHasSufficientFunds] = useState(true);
  const form = useFormContext<ShipmentForm>();
  const { userProfile } = useAuth();
  
  // Safely get orderID from form context if available
  const orderId = form?.getValues ? form.getValues("orderId") : undefined;

  // Fetch wallet balance when component mounts or user changes
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!userProfile?.company_id) return;

      try {
        const { data, error } = await supabase
          .from('wallets')
          .select('balance')
          .eq('company_id', userProfile.company_id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching wallet balance:', error);
          return;
        }

        const balance = data?.balance || 0;
        setWalletBalance(balance);
        
        // Check if user has sufficient funds for the selected rate
        if (selectedRate) {
          const rateAmount = parseFloat(selectedRate.rate);
          setHasSufficientFunds(balance >= rateAmount);
        }
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
      }
    };

    fetchWalletBalance();
  }, [userProfile?.company_id, selectedRate]);
  
  const handlePurchaseLabel = async () => {
    if (!selectedRate) {
      toast.error("Please select a shipping rate first");
      return;
    }
    
    if (!shipmentResponse.id) {
      toast.error("Missing combined shipment ID");
      return;
    }

    // Check if user has sufficient funds
    const rateAmount = parseFloat(selectedRate.rate);
    if (walletBalance < rateAmount) {
      toast.error(`Insufficient funds. You need $${rateAmount.toFixed(2)} but only have $${walletBalance.toFixed(2)} in your wallet.`);
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
  
  const selectedRateAmount = selectedRate ? parseFloat(selectedRate.rate) : 0;
  const showInsufficientFundsWarning = selectedRate && !hasSufficientFunds;

  return (
    <div className="mt-6 pt-4 border-t">
      {showInsufficientFundsWarning && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">
            Insufficient funds. You need ${selectedRateAmount.toFixed(2)} but only have ${walletBalance.toFixed(2)} in your wallet.
          </span>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={onBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button 
          onClick={handlePurchaseLabel}
          disabled={!selectedRate || purchasing || !hasSufficientFunds} 
          className={purchasing ? "bg-transparent hover:bg-transparent border-transparent" : "bg-tms-blue hover:bg-tms-blue-400 gap-1"}
        >
          {purchasing ? (
            <LoadingSpinner size={100} className="[&>span]:hidden [&>div]:bg-transparent tornado-360-spin" />
          ) : (
            <>
              <Package className="w-4 h-4" />
              Buy Shipping Label
              {selectedRate && <span className="ml-1">${parseFloat(selectedRate.rate).toFixed(2)}</span>}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

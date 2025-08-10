
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
import { LabelService } from "@/services/easypost/labelService";

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
      // Use multi-parcel flow when more than one parcel
      const storedParcels = (() => {
        try { return JSON.parse(localStorage.getItem('multiParcels') || '[]'); } catch { return []; }
      })();
      const multiParcels = (form as any)?.getValues?.('multiParcels') || storedParcels;
      console.log('Multi-parcel purchase check: parcels found =', Array.isArray(multiParcels) ? multiParcels.length : 0);
      if (Array.isArray(multiParcels) && multiParcels.length > 1) {
        const gv = (k: any) => (form?.getValues ? (form as any).getValues(k) : '');
        const fallbackParcel = {
          length: Number(gv('length')) || 6,
          width: Number(gv('width')) || 4,
          height: Number(gv('height')) || 2,
          weight: Number(gv('weight')) || 16,
        };
        const sanitizedParcels = multiParcels.map((p: any, idx: number) => {
          const sp = {
            length: Math.max(1, Number(p?.length ?? fallbackParcel.length) || fallbackParcel.length),
            width: Math.max(1, Number(p?.width ?? fallbackParcel.width) || fallbackParcel.width),
            height: Math.max(1, Number(p?.height ?? fallbackParcel.height) || fallbackParcel.height),
            weight: Math.max(1, Number(p?.weight ?? fallbackParcel.weight) || fallbackParcel.weight),
          };
          console.log(`Parcel[${idx}] sanitized:`, sp);
          return sp;
        });
        const to = {
          name: gv('toName'),
          company: gv('toCompany'),
          street1: gv('toStreet1'),
          street2: gv('toStreet2'),
          city: gv('toCity'),
          state: gv('toState'),
          zip: gv('toZip'),
          country: gv('toCountry'),
          phone: gv('toPhone'),
          email: gv('toEmail'),
        };
        const from = {
          name: gv('fromName'),
          company: gv('fromCompany'),
          street1: gv('fromStreet1'),
          street2: gv('fromStreet2'),
          city: gv('fromCity'),
          state: gv('fromState'),
          zip: gv('fromZip'),
          country: gv('fromCountry'),
          phone: gv('fromPhone'),
          email: gv('fromEmail'),
        };

        const labelService = new LabelService('');
        const provider = (selectedRate as any)?.provider;
        const carrier = (selectedRate as any)?.carrier;
        const service = (selectedRate as any)?.service;

        // Preflight: estimate total cost to ensure sufficient wallet funds for all parcels
        let estimateTotal = 0;
        try {
          const estimate = await labelService.estimateMultipleLabelsCost({
            packages: sanitizedParcels,
            provider,
            carrier,
            service,
            to,
            from,
          });
          // If estimation covered fewer parcels, fall back to selected rate * count
          const fallbackTotal = selectedRateAmount * sanitizedParcels.length;
          estimateTotal = Math.max(estimate.total, fallbackTotal);
        } catch (estErr: any) {
          console.warn('Estimation failed, falling back to simple multiplier:', estErr?.message || estErr);
          estimateTotal = selectedRateAmount * sanitizedParcels.length;
        }

        if (walletBalance < estimateTotal) {
          toast.error(`Insufficient funds. Need $${estimateTotal.toFixed(2)} for ${sanitizedParcels.length} labels, wallet has $${walletBalance.toFixed(2)}.`);
          return;
        }

        toast.info(`Purchasing ${sanitizedParcels.length} labels...`);
        const resp = await labelService.purchaseMultipleLabels({
          packages: sanitizedParcels,
          orderId,
          provider,
          carrier,
          service,
          to,
          from,
        });

        if (resp.errors?.length) {
          console.error('Multi-parcel purchase errors:', resp.errors);
          const first = resp.errors[0]?.error || 'Unknown error';
          toast.error(`Purchased ${resp.results.length} labels, ${resp.errors.length} failed. First error: ${first}`);
        } else {
          toast.success(`Purchased ${resp.results.length} labels successfully`);
        }
      } else {
        console.log(`Purchasing label for shipment ${shipmentResponse.id} with rate ${selectedRate.id}`);
        const labelService = new LabelService('');
        const provider = (selectedRate as any)?.provider;
        await labelService.purchaseLabel(
          shipmentResponse.id,
          (selectedRate as any).id,
          orderId,
          provider
        );
      }
      } catch (error: any) {
        console.error("Error purchasing label(s):", error);
        const msg = error?.message || (typeof error === 'string' ? error : 'Failed to purchase shipping label(s)');
        toast.error(msg);
      } finally {
      setPurchasing(false);
    }
  };
  
  const selectedRateAmount = selectedRate ? parseFloat(selectedRate.rate) : 0;
  const showInsufficientFundsWarning = selectedRate && !hasSufficientFunds;

  // Display: if multi-parcel, show estimated total (rate x count)
  const storedParcelsForDisplay = (() => {
    try { return JSON.parse(localStorage.getItem('multiParcels') || '[]'); } catch { return []; }
  })();
  const multiParcelsCount = (form as any)?.getValues?.('multiParcels')?.length || storedParcelsForDisplay.length || 0;
  const estimatedTotalAmount = selectedRate ? selectedRateAmount * (multiParcelsCount > 1 ? multiParcelsCount : 1) : 0;

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
              {multiParcelsCount > 1 ? `Buy ${multiParcelsCount} Labels` : 'Buy Shipping Label'}
              {selectedRate && (
                <span className="ml-1">
                  {multiParcelsCount > 1 ? `~$${estimatedTotalAmount.toFixed(2)}` : `$${selectedRateAmount.toFixed(2)}`}
                </span>
              )}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

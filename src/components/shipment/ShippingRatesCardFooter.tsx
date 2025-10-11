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
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LabelService } from "@/services/easypost/labelService";
import { BulkShippingLabelDialog } from "@/components/cartonization/BulkShippingLabelDialog";
import { MultiPackageRatesDisplay } from "./MultiPackageRatesDisplay";
import { useNavigate } from "react-router-dom";

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
  const [showMultiLabelsDialog, setShowMultiLabelsDialog] = useState(false);
  const [showMultiPackageRates, setShowMultiPackageRates] = useState(false);
  const [shipmentLabels, setShipmentLabels] = useState<Array<{ orderId: string; labelUrl: string; trackingNumber: string; carrier: string; service: string }>>([]);
  const form = useFormContext<ShipmentForm>();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  // Safely get orderID from form context or URL fallback
  const formOrderId = form?.getValues ? form.getValues("orderId") : undefined;
  const urlOrderId = (() => { try { return new URLSearchParams(window.location.search).get('orderId'); } catch { return null; } })();
  const orderId = formOrderId || urlOrderId || undefined;

  // Handle dialog close and navigate to orders page
  const handleMultiDialogClose = () => {
    setShowMultiLabelsDialog(false);
    if (orderId) {
      navigate(`/orders?highlight=${orderId}`);
    } else {
      navigate('/orders');
    }
  };

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
      // Check for multi-package scenario
      const storedParcels = (() => {
        try { return JSON.parse(localStorage.getItem('multiParcels') || '[]'); } catch { return []; }
      })();
      const multiParcels = (form as any)?.getValues?.('multiParcels') || storedParcels;
      
      // If multiple packages, show individual rates display
      if (Array.isArray(multiParcels) && multiParcels.length > 1) {
        setShowMultiPackageRates(true);
        setPurchasing(false);
        return;
      }

      // Single package flow
      console.log(`Purchasing label for shipment ${shipmentResponse.id} with rate ${selectedRate.id}`);
      await onBuyLabel(shipmentResponse.id, (selectedRate as any).id);
    } catch (error: any) {
      console.error("Error purchasing label:", error);
      const msg = error?.message || (typeof error === 'string' ? error : 'Failed to purchase shipping label');
      toast.error(msg);
    } finally {
      setPurchasing(false);
    }
  };

  const handleMultiPackagePurchase = async (packageRates: any[]) => {
    if (!packageRates.length) return;
    
    setPurchasing(true);
    
    try {
      const labelService = new LabelService('');
      const purchasePromises = packageRates.map(async (pkgRate, index) => {
        if (!pkgRate.selectedRate) return null;
        
        const provider = (pkgRate.selectedRate as any)?.provider || 'easypost';
        const carrier = pkgRate.selectedRate.carrier;
        const service = pkgRate.selectedRate.service;
        
        // Get addresses from the existing shipment response
        const epTo = (shipmentResponse as any)?.easypost_shipment?.to_address;
        const epFrom = (shipmentResponse as any)?.easypost_shipment?.from_address;
        
        const toAddress = epTo || {};
        const fromAddress = epFrom || {};
        
        try {
          const result = await labelService.purchaseMultipleLabels({
            packages: [pkgRate.dimensions],
            orderId,
            provider,
            carrier,
            service,
            to: toAddress,
            from: fromAddress,
          });
          
          return result;
        } catch (error) {
          console.error(`Failed to purchase label for package ${index + 1}:`, error);
          return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      const results = await Promise.allSettled(purchasePromises);
      const successfulPurchases = results
        .filter((r, i) => r.status === 'fulfilled' && r.value && !r.value.error)
        .map((r: any) => r.value);

      // Process successful purchases into label format
      const labels: any[] = [];
      successfulPurchases.forEach((result) => {
        if (result?.results) {
          result.results.forEach((r: any) => {
            const p = r.purchase || r;
            const labelUrl = p?.postage_label?.label_url || p?.label_url;
            if (labelUrl) {
              labels.push({
                orderId: orderId || `Package-${labels.length + 1}`,
                labelUrl,
                trackingNumber: p?.tracking_code || p?.tracking_number || 'N/A',
                carrier: p?.selected_rate?.carrier || p?.rate?.carrier || p?.carrier || 'Unknown',
                service: p?.selected_rate?.service || p?.rate?.service || p?.service || 'Unknown',
              });
            }
          });
        }
      });

      if (labels.length > 0) {
        // Update order status if needed
        try {
          if (orderId && !isNaN(Number(orderId))) {
            await supabase.from('orders').update({ status: 'shipped' }).eq('id', Number(orderId));
          }
        } catch (e) {
          console.warn('Failed to mark order shipped:', e);
        }

        setShipmentLabels(labels);
        setShowMultiLabelsDialog(true);
        setShowMultiPackageRates(false);
        toast.success(`Successfully purchased ${labels.length} labels`);
      } else {
        toast.error('Failed to purchase any labels');
      }

    } catch (error: any) {
      console.error("Error purchasing multi-package labels:", error);
      toast.error(error?.message || 'Failed to purchase labels');
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

  // Display multi-package rates if requested
  if (showMultiPackageRates) {
    const storedParcels = (() => {
      try { return JSON.parse(localStorage.getItem('multiParcels') || '[]'); } catch { return []; }
    })();
    const multiParcels = (form as any)?.getValues?.('multiParcels') || storedParcels;
    
    // Get addresses from the existing shipment response
    const epTo = (shipmentResponse as any)?.easypost_shipment?.to_address;
    const epFrom = (shipmentResponse as any)?.easypost_shipment?.from_address;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => setShowMultiPackageRates(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Summary
          </Button>
        </div>
        
        <MultiPackageRatesDisplay
          packages={multiParcels}
          toAddress={epTo}
          fromAddress={epFrom}
          onRatesCalculated={() => {}}
          onPurchaseAll={handleMultiPackagePurchase}
        />
      </div>
    );
  }

  return (
    <>
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
                    {multiParcelsCount > 1 ? `View Individual Rates` : `$${selectedRateAmount.toFixed(2)}`}
                  </span>
                )}
              </>
            )}
          </Button>
        </div>
      </div>

      <BulkShippingLabelDialog
        isOpen={showMultiLabelsDialog}
        onClose={handleMultiDialogClose}
        shipmentLabels={shipmentLabels}
      />
    </>
  );
};
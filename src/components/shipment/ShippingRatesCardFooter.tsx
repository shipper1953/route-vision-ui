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
      
      // Fetch order cartonization data to get box IDs
      let packageBoxIds: (string | null)[] = [];
      
      if (orderId) {
        try {
          const { data: cartonData } = await supabase
            .from('order_cartonization')
            .select('packages, recommended_box_id')
            .eq('order_id', typeof orderId === 'string' ? parseInt(orderId, 10) : orderId)
            .single();
          
          console.log('📦 Cartonization data:', cartonData);
          
          if (cartonData?.packages && Array.isArray(cartonData.packages)) {
            // Extract box IDs from each package
            const potentialBoxIds = cartonData.packages.map((pkg: any) => pkg.box_id || cartonData.recommended_box_id);
            
            // Validate that box IDs actually exist in the boxes table
            if (potentialBoxIds.some(id => id)) {
              const validBoxIds = potentialBoxIds.filter(id => id);
              if (validBoxIds.length > 0) {
                const { data: validBoxes } = await supabase
                  .from('boxes')
                  .select('id')
                  .in('id', validBoxIds);
                
                const validBoxIdSet = new Set(validBoxes?.map(b => b.id) || []);
                console.log('✅ Valid box IDs from database:', Array.from(validBoxIdSet));
                
                // Only use box IDs that actually exist
                packageBoxIds = potentialBoxIds.map(id => validBoxIdSet.has(id) ? id : null);
              }
            }
            
            console.log('📦 Final package box IDs:', packageBoxIds);
          } else if (cartonData?.recommended_box_id) {
            // Validate the recommended box exists
            const { data: validBox } = await supabase
              .from('boxes')
              .select('id')
              .eq('id', cartonData.recommended_box_id)
              .single();
            
            if (validBox) {
              packageBoxIds = packageRates.map(() => cartonData.recommended_box_id);
              console.log('📦 Using validated recommended box for all packages:', cartonData.recommended_box_id);
            } else {
              console.warn('❌ Recommended box ID does not exist:', cartonData.recommended_box_id);
            }
          }
        } catch (error) {
          console.error('❌ Failed to fetch/validate box IDs:', error);
        }
      }
      
      // Ensure packageBoxIds array matches packageRates length
      if (packageBoxIds.length === 0) {
        packageBoxIds = packageRates.map(() => null);
        console.log('⚠️ No valid box IDs found, using null for all packages');
      }
      
      // Build array of selected rates with their shipment, rate IDs, and box info
      const selectedRates = packageRates.map((pkgRate, index) => {
        if (!pkgRate.selectedRate) {
          console.error(`Package ${index + 1}: No rate selected`);
          return null;
        }
        
        const selectedRate = pkgRate.selectedRate;
        const provider = (selectedRate as any)?.provider || 'easypost';
        
        // Get the correct shipment ID based on provider from the rate's stored data
        let shipmentId: string | undefined;
        const storedShipmentData = (selectedRate as any)?._shipment_data;
        
        console.log(`Package ${index + 1} debug:`, {
          provider,
          rate_shipment_id: (selectedRate as any)?.shipment_id,
          stored_shippo_id: storedShipmentData?.shippo_shipment?.object_id,
          stored_easypost_id: storedShipmentData?.easypost_shipment?.id,
          response_shippo_id: (shipmentResponse as any)?.shippo_shipment?.object_id,
          response_easypost_id: (shipmentResponse as any)?.easypost_shipment?.id
        });
        
        if (provider === 'shippo') {
          shipmentId = (selectedRate as any)?.shipment_id || 
                       storedShipmentData?.shippo_shipment?.object_id || 
                       (shipmentResponse as any)?.shippo_shipment?.object_id;
        } else {
          shipmentId = (selectedRate as any)?.shipment_id || 
                       storedShipmentData?.easypost_shipment?.id ||
                       (shipmentResponse as any)?.easypost_shipment?.id;
        }
        
        if (!shipmentId) {
          console.error(`❌ Package ${index + 1}: Missing shipment ID for ${provider}. Selected rate:`, selectedRate);
          return null;
        }
        
        console.log(`✅ Package ${index + 1}: shipmentId=${shipmentId}, rateId=${selectedRate.id}, provider=${provider}, carrier=${selectedRate.carrier}, service=${selectedRate.service}`);
        
        return {
          shipmentId,
          rateId: selectedRate.id,
          provider,
          boxId: packageBoxIds[index] || null
        };
      }).filter(Boolean) as Array<{ shipmentId: string; rateId: string; provider: string; boxId: string | null }>;
      
      // Validate we have shipment IDs for all packages
      if (selectedRates.length === 0) {
        throw new Error('No packages have valid shipment IDs');
      }
      
      if (selectedRates.length !== packageRates.length) {
        throw new Error(`Only ${selectedRates.length} of ${packageRates.length} packages have valid shipment IDs. Cannot proceed with purchase.`);
      }
      
      console.log('✅ All packages validated. Purchasing multi-package labels with selected rates:', selectedRates);
      
      // Get addresses from the existing shipment response
      const epTo = (shipmentResponse as any)?.easypost_shipment?.to_address;
      const epFrom = (shipmentResponse as any)?.easypost_shipment?.from_address;
      
      console.log('📍 Addresses for purchase:', { to: epTo?.city, from: epFrom?.city });
      
      const result = await labelService.purchaseMultipleLabels({
        packages: packageRates.map(pkgRate => pkgRate.dimensions),
        orderId,
        to: epTo || {},
        from: epFrom || {},
        selectedRates
      });
      
      console.log('📋 Purchase result:', result);

      // Process results into label format
      const labels: any[] = [];
      if (result?.results) {
        console.log(`✅ Processing ${result.results.length} results`);
        result.results.forEach((r: any, idx: number) => {
          console.log(`Processing result ${idx + 1}:`, r);
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
            console.log(`✅ Label ${labels.length} extracted:`, labels[labels.length - 1]);
          } else {
            console.warn(`❌ No label URL found in result ${idx + 1}:`, p);
          }
        });
      } else {
        console.error('❌ No results in response:', result);
      }
      
      if (result?.errors && result.errors.length > 0) {
        console.error('❌ Errors during purchase:', result.errors);
      }

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
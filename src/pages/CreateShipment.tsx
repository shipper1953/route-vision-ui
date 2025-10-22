
import { TmsLayout } from "@/components/layout/TmsLayout";
import { ShipmentForm } from "@/components/shipment/ShipmentForm";
import { ShippingRatesCard } from "@/components/shipment/ShippingRatesCard";
import { MultiPackageRatesDisplay } from "@/components/shipment/MultiPackageRatesDisplay";
import { useShipment } from "@/hooks/useShipment";
import { useState, useEffect } from "react";
import { ShippingLabelDialog } from "@/components/shipment/ShippingLabelDialog";
import { MultiPackageLabelDialog } from "@/components/shipment/MultiPackageLabelDialog";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { LabelService } from "@/services/easypost/labelService";

const CreateShipment = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const {
    shipmentResponse,
    selectedRate,
    recommendedRate,
    setSelectedRate,
    handleShipmentCreated,
    resetShipment,
    purchaseLabel
  } = useShipment(orderId);

  const [labelData, setLabelData] = useState<any>(null);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [selectedBoxData, setSelectedBoxData] = useState<any>(null);
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState<string | null>(null);
  const [shipmentAddresses, setShipmentAddresses] = useState<{ from: any; to: any } | null>(null);
  const [multiParcels, setMultiParcels] = useState<any[]>([]);
  const [multiPackageLabels, setMultiPackageLabels] = useState<any[]>([]);
  const [showMultiPackageDialog, setShowMultiPackageDialog] = useState(false);
  const [isPurchasingLabels, setIsPurchasingLabels] = useState(false);
  
  // Detect if this is a multi-package shipment (check if we have multiple parcels)
  const isMultiPackage = multiParcels && multiParcels.length > 1;

  // Log user context for debugging
  useEffect(() => {
    console.log("CreateShipment - User Profile:", userProfile);
    if (userProfile?.company_id) {
      console.log("User has company_id:", userProfile.company_id);
    } else {
      console.log("User does not have company_id assigned");
    }
  }, [userProfile]);

  // Log when shipmentResponse changes to debug
  useEffect(() => {
    if (shipmentResponse) {
      console.log("Shipment response updated:", shipmentResponse);
    }
  }, [shipmentResponse]);

  // Function to handle successful label purchase and verify database save
  const handleLabelPurchased = async (result: any) => {
    console.log("Label purchased successfully:", result);
    console.log("User context during label purchase:", userProfile);
    setLabelData(result);
    setShowLabelDialog(true);

    // The Edge Function should handle database saving, so we just verify it was saved
    if (result && result.id) {
      console.log("Verifying shipment was saved to database with easypost_id:", result.id);
      
      // Wait a moment for the Edge Function to complete its database save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if shipment exists in database with a few retries
      let shipmentFound = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: existingShipment, error: checkError } = await supabase
          .from('shipments')
          .select('*, company_id')
          .eq('easypost_id', result.id)
          .maybeSingle();

        if (checkError) {
          console.error("Error checking shipment in database:", checkError);
        } else if (existingShipment) {
          console.log("✅ Shipment confirmed in database:", existingShipment);
          if (existingShipment.company_id) {
            console.log("✅ Shipment has company_id:", existingShipment.company_id);
            toast.success("Shipment successfully saved with company assignment!");
          } else {
            console.warn("⚠️ Shipment saved but no company_id assigned");
            toast.warning("Shipment saved but no company assignment found");
          }
          shipmentFound = true;
          break;
        } else if (attempt < 2) {
          console.log(`Attempt ${attempt + 1}: Shipment not found yet, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!shipmentFound) {
        console.warn("⚠️ Shipment not found in database after multiple attempts");
        toast.warning("Label purchased successfully, but shipment may not be saved to database");
      }
    } else {
      console.warn("No result or result.id available for verification");
    }
  };

  // Handle dialog close and navigate to orders page
  const handleDialogClose = () => {
    setShowLabelDialog(false);
    if (orderId) {
      navigate(`/orders?highlight=${orderId}`);
    } else {
      navigate('/orders');
    }
  };

  const handleMultiPackageDialogClose = () => {
    setShowMultiPackageDialog(false);
    setMultiPackageLabels([]);
    if (orderId) {
      navigate(`/orders?highlight=${orderId}`);
    } else {
      navigate('/orders');
    }
  };

  return (
    <TmsLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tms-blue">Create Shipment</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">Create a new shipment with SmartRate</p>
            {orderId && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                Order: {orderId}
              </Badge>
            )}
          </div>
          {userProfile?.company_id && (
            <p className="text-sm text-green-600 mt-1">Company: {userProfile.company_id}</p>
          )}
        </div>
      </div>

      {!shipmentResponse ? (
        <ShipmentForm onShipmentCreated={(response, selectedRate, boxData) => {
          console.log('Shipment created with boxData:', boxData);
          
          if (boxData) {
            setSelectedBoxData(boxData);
          }
          
          // Extract multi-package data from localStorage (set by PackageManagementSection)
          const storedMultiParcels = localStorage.getItem('multiParcels');
          const storedSelectedBoxes = localStorage.getItem('selectedBoxes');
          
          if (storedMultiParcels && storedSelectedBoxes) {
            try {
              const parcels = JSON.parse(storedMultiParcels);
              const boxes = JSON.parse(storedSelectedBoxes);
              
              console.log('Multi-package data found:', { parcels, boxes });
              
              // Combine parcel dimensions with box info
              const combinedPackages = parcels.map((parcel: any, idx: number) => ({
                ...parcel,
                boxId: boxes[idx]?.boxId,
                boxSku: boxes[idx]?.boxSku,
                boxName: boxes[idx]?.boxName,
              }));
              
              setMultiParcels(combinedPackages);
            } catch (e) {
              console.error('Error parsing multi-package data:', e);
            }
          }
          
          // Extract required delivery date from form
          const formElement = document.querySelector('input[name="requiredDeliveryDate"]') as HTMLInputElement;
          if (formElement?.value) {
            setRequiredDeliveryDate(formElement.value);
          }
          
          // Store addresses for multi-package display
          if (response.easypost_shipment) {
            setShipmentAddresses({
              from: response.easypost_shipment.from_address,
              to: response.easypost_shipment.to_address
            });
          } else if (response.shippo_shipment) {
            setShipmentAddresses({
              from: response.shippo_shipment.address_from,
              to: response.shippo_shipment.address_to
            });
          }
          
          handleShipmentCreated(response);
        }} />
      ) : (
        <div className="space-y-8">
          {isMultiPackage && shipmentAddresses ? (
            <MultiPackageRatesDisplay
              packages={multiParcels}
              fromAddress={shipmentAddresses.from}
              toAddress={shipmentAddresses.to}
              requiredDeliveryDate={requiredDeliveryDate}
              onPurchaseAll={async (packageRates) => {
                console.log('🚀 Starting multi-package purchase for', packageRates.length, 'packages');
                console.log('Package rates data:', JSON.stringify(packageRates, null, 2));
                
                // Prevent multiple simultaneous purchases
                if (isPurchasingLabels) {
                  console.warn('⚠️ Purchase already in progress, blocking duplicate request');
                  toast.warning('Label purchase already in progress');
                  return;
                }
                
                setIsPurchasingLabels(true);
                const purchasedLabels = [];
                const errors = [];
                
                try {
                  const labelService = new LabelService('');
                  toast.info(`Starting purchase of ${packageRates.length} package labels...`);
                  
                  // Process each package individually with detailed logging
                  for (let i = 0; i < packageRates.length; i++) {
                    console.log(`\n📦 Processing package ${i + 1} of ${packageRates.length}`);
                    const pkgRate = packageRates[i];
                    const rate = pkgRate.selectedRate;
                    
                    // Validation checks
                    if (!rate) {
                      const errorMsg = `Package ${i + 1}: No rate selected`;
                      console.error(`❌ ${errorMsg}`);
                      errors.push(errorMsg);
                      toast.error(errorMsg);
                      continue;
                    }
                    
                    console.log(`Package ${i + 1} rate details:`, {
                      provider: rate.provider,
                      carrier: rate.carrier,
                      service: rate.service,
                      rate: rate.rate,
                      id: rate.id
                    });
                    
                    try {
                      // Get shipment ID from rate's stored data
                      // For Shippo: check original_rate.shipment
                      // For EasyPost: check _shipment_data
                      const shipmentId = rate.shipment_id 
                        || rate.original_rate?.shipment 
                        || rate._shipment_data?.easypost_shipment?.id 
                        || rate._shipment_data?.shippo_shipment?.object_id;
                      
                      if (!shipmentId) {
                        const errorMsg = `Package ${i + 1}: No shipment ID found in rate data`;
                        console.error(`❌ ${errorMsg}`);
                        console.log('Rate object:', rate);
                        errors.push(errorMsg);
                        toast.error(errorMsg);
                        continue;
                      }
                      
                      console.log(`Package ${i + 1} shipment ID:`, shipmentId);
                      
                      // Prepare box data for this package
                      const boxData = {
                        selectedBoxId: pkgRate.packageDimensions.boxId,
                        selectedBoxSku: pkgRate.packageDimensions.boxSku,
                        selectedBoxName: pkgRate.packageDimensions.boxName,
                      };
                      
                      console.log(`Package ${i + 1} box data:`, boxData);
                      
                      // Get items for this package
                      const packageItems = (pkgRate.packageDimensions as any)?.items || [];
                      console.log(`Package ${i + 1} items:`, packageItems);
                      
                      // Convert items to selectedItems format if needed
                      const selectedItems = packageItems.map((item: any) => ({
                        itemId: item.itemId || item.id, // Prioritize real itemId
                        name: item.name,
                        sku: item.sku,
                        quantity: item.quantity,
                        dimensions: item.dimensions || {
                          length: item.length,
                          width: item.width,
                          height: item.height,
                          weight: item.weight
                        }
                      }));
                      
                      console.log(`Package ${i + 1} selected items:`, selectedItems);
                      console.log(`🔄 Calling labelService.purchaseLabel for package ${i + 1}...`);
                      
                      const result = await labelService.purchaseLabel(
                        shipmentId,
                        rate.id,
                        orderId,
                        rate.provider,
                        boxData,
                        selectedItems // Pass items to label purchase
                      );
                      
                      console.log(`✅ Package ${i + 1} label purchased successfully:`, {
                        tracking: result.tracking_code || result.tracking_number,
                        labelUrl: result.postage_label?.label_url || result.label_url
                      });
                      
                      purchasedLabels.push({
                        packageIndex: i,
                        label: result,
                        rate: rate
                      });
                      
                      toast.success(`Package ${i + 1} of ${packageRates.length} label purchased`);
                      
                      // Add small delay between purchases to avoid rate limits
                      if (i < packageRates.length - 1) {
                        console.log(`⏳ Waiting 500ms before next purchase...`);
                        await new Promise(resolve => setTimeout(resolve, 500));
                      }
                      
                    } catch (error) {
                      const errorMsg = `Package ${i + 1} purchase failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
                      console.error(`❌ ${errorMsg}`);
                      console.error('Full error:', error);
                      errors.push(errorMsg);
                      toast.error(`Failed: Package ${i + 1}`);
                      // Continue to next package even if this one fails
                    }
                  }
                  
                  console.log('\n📊 Purchase summary:');
                  console.log(`   Success: ${purchasedLabels.length}`);
                  console.log(`   Errors: ${errors.length}`);
                  console.log(`   Total: ${packageRates.length}`);
                  
                  // Show results
                  if (purchasedLabels.length > 0) {
                    console.log('✅ Opening multi-package dialog with', purchasedLabels.length, 'labels');
                    
                    if (errors.length > 0) {
                      toast.warning(`Purchased ${purchasedLabels.length} of ${packageRates.length} labels. ${errors.length} failed.`);
                    } else {
                      toast.success(`Successfully purchased all ${purchasedLabels.length} labels!`);
                    }
                    
                    // Use a small delay to ensure state is set properly
                    setTimeout(() => {
                      setMultiPackageLabels(purchasedLabels);
                      setShowMultiPackageDialog(true);
                    }, 100);
                  } else {
                    console.error('❌ No labels were purchased successfully');
                    toast.error('Failed to purchase any labels. Check console for details.');
                  }
                  
                } catch (error) {
                  console.error('💥 Fatal error in multi-package purchase:', error);
                  toast.error(error instanceof Error ? error.message : 'Failed to purchase labels');
                } finally {
                  setIsPurchasingLabels(false);
                  console.log('🏁 Multi-package purchase process complete\n');
                }
              }}
            />
          ) : (
            <ShippingRatesCard
              shipmentResponse={shipmentResponse}
              selectedRate={selectedRate}
              setSelectedRate={setSelectedRate}
              recommendedRate={recommendedRate}
              onBack={resetShipment}
              onBuyLabel={async (shipmentId, rateId) => {
                console.log('Purchasing label with selected box data:', selectedBoxData);
                const selectedItems = selectedBoxData?.selectedItems;
                const result = await purchaseLabel(shipmentId, rateId, selectedBoxData, selectedItems);
                if (result) {
                  // Check fulfillment status after label purchase
                  await handleLabelPurchased(result);
                  
                  // Show fulfillment feedback
                  if (orderId) {
                    try {
                      const { data: orderData } = await supabase
                        .from('orders')
                        .select('fulfillment_status, fulfillment_percentage, items_shipped, items_total')
                        .eq('id', Number(orderId))
                        .single();
                      
                      if (orderData) {
                        if (orderData.fulfillment_status === 'fulfilled') {
                          toast.success(`Order fully fulfilled! All ${orderData.items_total} items shipped.`);
                        } else if (orderData.fulfillment_status === 'partially_fulfilled') {
                          toast.info(`Order partially fulfilled: ${orderData.items_shipped}/${orderData.items_total} items shipped (${orderData.fulfillment_percentage?.toFixed(0)}%)`);
                        }
                      }
                    } catch (err) {
                      console.warn('Failed to fetch fulfillment status:', err);
                    }
                  }
                }
                return result;
              }}
            />
          )}

          {/* Shipping Label Dialog */}
          <ShippingLabelDialog
            isOpen={showLabelDialog}
            onClose={handleDialogClose}
            labelUrl={labelData?.postage_label?.label_url || labelData?.label_url}
            shipmentId={labelData?.object_id || labelData?.id || ''}
            orderDetails={labelData ? {
              carrier: labelData.selected_rate?.carrier || 'Unknown',
              service: labelData.selected_rate?.service || 'Unknown',
              trackingCode: labelData.tracking_code || labelData.tracking_number || 'N/A',
              trackingUrl: labelData.tracker?.public_url || labelData.tracking_url_provider || '',
              createdAt: new Date().toLocaleString()
            } : undefined}
          />

          {/* Multi-Package Label Dialog */}
          <MultiPackageLabelDialog
            isOpen={showMultiPackageDialog}
            onClose={handleMultiPackageDialogClose}
            packageLabels={multiPackageLabels}
          />
        </div>
      )}
    </TmsLayout>
  );
};

export default CreateShipment;

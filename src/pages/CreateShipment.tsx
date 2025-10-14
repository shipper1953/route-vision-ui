
import { TmsLayout } from "@/components/layout/TmsLayout";
import { ShipmentForm } from "@/components/shipment/ShipmentForm";
import { ShippingRatesCard } from "@/components/shipment/ShippingRatesCard";
import { MultiPackageRatesDisplay } from "@/components/shipment/MultiPackageRatesDisplay";
import { useShipment } from "@/hooks/useShipment";
import { useState, useEffect } from "react";
import { ShippingLabelDialog } from "@/components/shipment/ShippingLabelDialog";
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
                console.log('Purchasing all labels for packages:', packageRates);
                
                try {
                  const labelService = new (await import('@/services/easypost/labelService')).LabelService('');
                  const purchasedLabels = [];
                  
                  for (let i = 0; i < packageRates.length; i++) {
                    const pkgRate = packageRates[i];
                    const rate = pkgRate.selectedRate;
                    
                    if (!rate) {
                      toast.error(`Package ${i + 1} has no selected rate`);
                      continue;
                    }
                    
                    console.log(`Purchasing label for package ${i + 1}:`, {
                      provider: rate.provider,
                      carrier: rate.carrier,
                      service: rate.service,
                      rate: rate.rate
                    });
                    
                    // Get shipment ID from rate's stored data
                    const shipmentId = rate.shipment_id || rate._shipment_data?.easypost_shipment?.id || rate._shipment_data?.shippo_shipment?.object_id;
                    
                    if (!shipmentId) {
                      toast.error(`Package ${i + 1}: No shipment ID found`);
                      continue;
                    }
                    
                    // Prepare box data for this package
                    const boxData = {
                      selectedBoxId: pkgRate.packageDimensions.boxId,
                      selectedBoxSku: pkgRate.packageDimensions.boxSku,
                      selectedBoxName: pkgRate.packageDimensions.boxName,
                    };
                    
                    const result = await labelService.purchaseLabel(
                      shipmentId,
                      rate.id,
                      orderId,
                      rate.provider,
                      boxData
                    );
                    
                    purchasedLabels.push({
                      packageIndex: i,
                      label: result,
                      rate: rate
                    });
                    
                    toast.success(`Package ${i + 1} label purchased successfully`);
                  }
                  
                  console.log('All labels purchased:', purchasedLabels);
                  
                  // Navigate to orders page with highlight
                  if (orderId) {
                    navigate(`/orders?highlight=${orderId}`);
                  } else {
                    navigate('/orders');
                  }
                  
                  toast.success(`Successfully purchased ${purchasedLabels.length} labels!`);
                  
                } catch (error) {
                  console.error('Multi-package purchase error:', error);
                  toast.error(error instanceof Error ? error.message : 'Failed to purchase labels');
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
                const result = await purchaseLabel(shipmentId, rateId, selectedBoxData);
                if (result) {
                  // Client-side fallback: mark order shipped and link shipment if provided
                  try {
                    if (orderId && !isNaN(Number(orderId))) {
                      const update: any = { status: 'shipped' };
                      if ((result as any).shipment_id) update.shipment_id = (result as any).shipment_id;
                      await supabase.from('orders').update(update).eq('id', Number(orderId));
                    }
                  } catch (e) {
                    console.warn('Failed to update order after purchase (client fallback):', e);
                  }
                  await handleLabelPurchased(result);
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
        </div>
      )}
    </TmsLayout>
  );
};

export default CreateShipment;

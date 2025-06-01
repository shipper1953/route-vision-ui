
import { TmsLayout } from "@/components/layout/TmsLayout";
import { ShipmentForm } from "@/components/shipment/ShipmentForm";
import { ShippingRatesCard } from "@/components/shipment/ShippingRatesCard";
import { useShipment } from "@/hooks/useShipment";
import { useState, useEffect } from "react";
import { ShippingLabelDialog } from "@/components/shipment/ShippingLabelDialog";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CreateShipment = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const navigate = useNavigate();

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

  // Log when shipmentResponse changes to debug
  useEffect(() => {
    if (shipmentResponse) {
      console.log("Shipment response updated:", shipmentResponse);
    }
  }, [shipmentResponse]);

  // Function to handle successful label purchase and insert to Supabase
  const handleLabelPurchased = async (result: any) => {
    console.log("Label purchased successfully:", result);
    setLabelData(result);
    setShowLabelDialog(true);

    // Insert shipment to Supabase - the Edge Function should handle this, but let's verify
    if (result && result.id) {
      console.log("Verifying shipment was saved to database with easypost_id:", result.id);
      
      // Check if shipment exists in database
      const { data: existingShipment, error: checkError } = await supabase
        .from('shipments')
        .select('*')
        .eq('easypost_id', result.id)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking shipment in database:", checkError);
        toast.error("Error verifying shipment in database");
      } else if (existingShipment) {
        console.log("✅ Shipment confirmed in database:", existingShipment);
        toast.success("Shipment successfully saved to database!");
      } else {
        console.warn("⚠️ Shipment not found in database, attempting manual save...");
        
        // Get current user to include user_id in the manual save
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error("Error getting current user:", userError);
          toast.error("Authentication error - cannot save shipment");
          return;
        }
        
        // Manual fallback save if Edge Function didn't save it - include user_id
        const shipmentData = {
          easypost_id: result.id,
          tracking_number: result.tracking_code,
          carrier: result.selected_rate?.carrier || 'Unknown',
          service: result.selected_rate?.service || 'Standard',
          status: "purchased",
          label_url: result.postage_label?.label_url,
          weight: String(parseFloat(result.parcel?.weight) || 0),
          cost: parseFloat(result.selected_rate?.rate) || 0,
          package_dimensions: JSON.stringify({
            length: result.parcel?.length || 0,
            width: result.parcel?.width || 0,
            height: result.parcel?.height || 0
          }),
          package_weights: JSON.stringify({
            weight: result.parcel?.weight || 0,
            weight_unit: result.parcel?.weight_unit || 'oz'
          }),
          tracking_url: result.tracker?.public_url,
          user_id: user.id, // Include user_id for RLS
          created_at: new Date().toISOString(),
        };

        console.log("Manual shipment data to be saved:", shipmentData);

        const { error: insertError, data: insertData } = await supabase
          .from('shipments')
          .insert(shipmentData)
          .select();

        if (insertError) {
          console.error("Failed to manually save shipment:", insertError);
          toast.error("Failed to save shipment: " + insertError.message);
        } else {
          console.log("✅ Successfully manually saved shipment to database:", insertData);
          toast.success("Shipment manually saved to database!");
        }
      }
    } else {
      console.warn("No result or result.id available for saving to database");
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
          <p className="text-muted-foreground">Create a new shipment with SmartRate</p>
        </div>
      </div>

      {!shipmentResponse ? (
        <ShipmentForm onShipmentCreated={handleShipmentCreated} />
      ) : (
        <div className="space-y-8">
          <ShippingRatesCard
            shipmentResponse={shipmentResponse}
            selectedRate={selectedRate}
            setSelectedRate={setSelectedRate}
            recommendedRate={recommendedRate}
            onBack={resetShipment}
            onBuyLabel={async (shipmentId, rateId) => {
              const result = await purchaseLabel(shipmentId, rateId);
              if (result) {
                await handleLabelPurchased(result);
              }
              return result;
            }}
          />

          {/* Shipping Label Dialog */}
          <ShippingLabelDialog
            isOpen={showLabelDialog}
            onClose={handleDialogClose}
            labelUrl={labelData?.postage_label?.label_url}
            shipmentId={labelData?.id || ''}
            orderDetails={labelData ? {
              carrier: labelData.selected_rate?.carrier,
              service: labelData.selected_rate?.service,
              trackingCode: labelData.tracking_code,
              trackingUrl: labelData.tracker?.public_url,
              createdAt: new Date().toLocaleString()
            } : undefined}
          />
        </div>
      )}
    </TmsLayout>
  );
};

export default CreateShipment;

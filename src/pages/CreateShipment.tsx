
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

    // Insert shipment to Supabase with correct data types (no upsert to avoid conflict)
    if (result && result.id) {
      console.log("Preparing to save shipment to database with easypost_id:", result.id);
      
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
        order_id: result.reference || orderId || null,
        tracking_url: result.tracker?.public_url,
        created_at: new Date().toISOString(),
      };

      console.log("Shipment data to be saved:", shipmentData);

      // Check if shipment already exists first
      const { data: existingShipment } = await supabase
        .from('shipments')
        .select('id')
        .eq('easypost_id', result.id)
        .maybeSingle();

      console.log("Existing shipment check result:", existingShipment);

      if (existingShipment) {
        // Update existing shipment
        console.log("Updating existing shipment with id:", existingShipment.id);
        const { error } = await supabase
          .from('shipments')
          .update(shipmentData)
          .eq('easypost_id', result.id);

        if (error) {
          console.error("Failed to update shipment:", error);
          toast.error("Failed to update shipment: " + error.message);
        } else {
          console.log("Successfully updated shipment in database");
          toast.success("Shipment updated in database!");
        }
      } else {
        // Insert new shipment
        console.log("Inserting new shipment");
        const { error, data } = await supabase
          .from('shipments')
          .insert(shipmentData)
          .select();

        if (error) {
          console.error("Failed to save shipment:", error);
          toast.error("Failed to save shipment: " + error.message);
        } else {
          console.log("Successfully inserted shipment into database:", data);
          toast.success("Shipment saved to database!");
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

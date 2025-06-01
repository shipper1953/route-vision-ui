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

  // Function to handle successful label purchase and upsert to Supabase
  const handleLabelPurchased = async (result: any) => {
    console.log("Label purchased successfully:", result);
    setLabelData(result);
    setShowLabelDialog(true);

    // Upsert shipment to Supabase
    if (result && result.id) {
      const shipmentData = {
        easypost_id: result.id,
        tracking_number: result.tracking_code,
        carrier: result.selected_rate?.carrier,
        service: result.selected_rate?.service,
        status: "purchased",
        label_url: result.postage_label?.label_url,
        weight: parseFloat(result.parcel?.weight) || 0,
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

      const { error } = await supabase
        .from('shipments')
        .upsert(shipmentData, { onConflict: 'easypost_id', ignoreDuplicates: false });

      if (error) {
        toast.error("Failed to save shipment: " + error.message);
      } else {
        toast.success("Shipment saved to database!");
      }
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
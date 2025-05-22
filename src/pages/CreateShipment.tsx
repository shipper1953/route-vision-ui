
import { TmsLayout } from "@/components/layout/TmsLayout";
import { ShipmentForm } from "@/components/shipment/ShipmentForm";
import { ShippingRatesCard } from "@/components/shipment/ShippingRatesCard";
import { useShipment } from "@/hooks/useShipment";
import { useState, useEffect } from "react";
import { ShipmentResponse, SmartRate, Rate } from "@/services/easypost";
import { ShippingLabelDialog } from "@/components/shipment/ShippingLabelDialog";
import { useNavigate, useSearchParams } from "react-router-dom";

const CreateShipment = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  
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
  const navigate = useNavigate();
  
  // Log when shipmentResponse changes to debug
  useEffect(() => {
    console.log("Shipment response updated:", shipmentResponse);
  }, [shipmentResponse]);
  
  // Function to handle successful label purchase
  const handleLabelPurchased = async (result: any) => {
    console.log("Label purchased successfully:", result);
    setLabelData(result);
    setShowLabelDialog(true);
  };
  
  // Handle dialog close and navigate to orders page
  const handleDialogClose = () => {
    setShowLabelDialog(false);
    
    // If we have an orderId, highlight it in the orders page
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
                handleLabelPurchased(result);
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

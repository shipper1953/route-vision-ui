
import { TmsLayout } from "@/components/layout/TmsLayout";
import { ShipmentForm } from "@/components/shipment/ShipmentForm";
import { ShippingRatesCard } from "@/components/shipment/ShippingRatesCard";
import { useShipment } from "@/hooks/useShipment";
import { useState, useEffect } from "react";

const CreateShipment = () => {
  const { 
    shipmentResponse, 
    selectedRate, 
    recommendedRate, 
    setSelectedRate, 
    handleShipmentCreated, 
    resetShipment 
  } = useShipment();
  
  // Log when shipmentResponse changes to debug
  useEffect(() => {
    console.log("Shipment response updated:", shipmentResponse);
  }, [shipmentResponse]);
  
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
          />
        </div>
      )}
    </TmsLayout>
  );
};

export default CreateShipment;

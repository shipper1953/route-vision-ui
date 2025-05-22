
import { useState } from "react";
import { SmartRate, Rate, ShipmentResponse } from "@/services/easypost";

export function useShipment() {
  // Update the type to accept both SmartRate and Rate
  const [shipmentResponse, setShipmentResponse] = useState<ShipmentResponse | null>(null);
  const [selectedRate, setSelectedRate] = useState<SmartRate | Rate | null>(null);
  const [recommendedRate, setRecommendedRate] = useState<SmartRate | null>(null);
  
  const handleShipmentCreated = (response: ShipmentResponse, recommendedRate: SmartRate | null) => {
    setShipmentResponse(response);
    setRecommendedRate(recommendedRate);
    setSelectedRate(recommendedRate);
  };
  
  const resetShipment = () => {
    setShipmentResponse(null);
    setSelectedRate(null);
    setRecommendedRate(null);
  };

  return {
    shipmentResponse,
    selectedRate,
    recommendedRate,
    setSelectedRate,
    handleShipmentCreated,
    resetShipment
  };
}

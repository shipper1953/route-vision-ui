import { useState } from "react";
import { SmartRate, ShipmentResponse } from "@/services/easypost";

export function useShipment() {
  const [shipmentResponse, setShipmentResponse] = useState<ShipmentResponse | null>(null);
  const [selectedRate, setSelectedRate] = useState<SmartRate | null>(null);
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

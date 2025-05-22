
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OrderData, linkShipmentToOrder } from "@/services/orderService";
import easyPostService, { ShipmentResponse, SmartRate, Rate } from "@/services/easypost";

export const useShipment = (orderId?: string) => {
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [shipmentResponse, setShipmentResponse] = useState<ShipmentResponse | null>(null);
  const [selectedRate, setSelectedRate] = useState<SmartRate | Rate | null>(null);
  const [recommendedRate, setRecommendedRate] = useState<SmartRate | Rate | null>(null);
  const navigate = useNavigate();

  const handleShipmentCreated = async (response: ShipmentResponse, recRate: SmartRate | Rate | null) => {
    setShipmentResponse(response);
    setRecommendedRate(recRate);
    
    return response;
  };

  const createShipment = async (shipmentData: any) => {
    setIsCreatingShipment(true);
    
    try {
      console.log("Creating shipment with data:", shipmentData);
      
      // Create shipment via EasyPost
      const shipmentResponse = await easyPostService.createShipment(shipmentData);
      
      setShipmentId(shipmentResponse.id);
      toast.success("Shipment created successfully!");
      
      return shipmentResponse;
    } catch (error) {
      console.error("Error creating shipment:", error);
      toast.error("Failed to create shipment");
      throw error;
    } finally {
      setIsCreatingShipment(false);
    }
  };

  const purchaseLabel = async (shipmentId: string, rateId: string) => {
    try {
      console.log(`Purchasing label for shipment ${shipmentId} with rate ${rateId}`);
      
      // Purchase label via EasyPost
      const labelResponse = await easyPostService.purchaseLabel(shipmentId, rateId);
      
      toast.success("Label purchased successfully!");
      
      // If we have an order ID, link the shipment to the order
      if (orderId) {
        try {
          // Get the ETA from the selected rate
          const selectedRate = labelResponse.selected_rate;
          const estimatedDeliveryDate = selectedRate?.delivery_date || undefined;
          
          // Link the shipment to the order
          await linkShipmentToOrder(orderId, {
            id: labelResponse.id,
            carrier: labelResponse.selected_rate?.carrier || "Unknown",
            service: labelResponse.selected_rate?.service || "Standard",
            trackingNumber: labelResponse.tracking_code || "Unknown",
            trackingUrl: labelResponse.tracker?.public_url || `https://www.trackingmore.com/track/en/${labelResponse.tracking_code}`,
            estimatedDeliveryDate,
            labelUrl: labelResponse.postage_label?.label_url
          });
          
          console.log("Shipment linked to order:", orderId);
        } catch (linkError) {
          console.error("Error linking shipment to order:", linkError);
          // Don't fail the overall process if linking fails
        }
      }
      
      return labelResponse;
    } catch (error) {
      console.error("Error purchasing label:", error);
      toast.error("Failed to purchase label");
      throw error;
    }
  };

  const resetShipment = () => {
    setShipmentResponse(null);
    setSelectedRate(null);
  };

  return {
    createShipment,
    purchaseLabel,
    isCreatingShipment,
    shipmentId,
    shipmentResponse,
    selectedRate,
    recommendedRate,
    setSelectedRate,
    handleShipmentCreated,
    resetShipment
  };
};

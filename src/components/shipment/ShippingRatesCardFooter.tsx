
import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { SmartRate, Rate } from "@/services/easypost";
import { toast } from "sonner";
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";
import { useState } from "react";
import easyPostService from "@/services/easypost";
import orderService from "@/services/orderService";
import { useNavigate } from "react-router-dom";

interface ShippingRatesCardFooterProps {
  selectedRate: SmartRate | Rate | null;
  onBack: () => void;
  shipmentId?: string; // Add shipmentId as a prop to use when form context isn't available
}

export const ShippingRatesCardFooter = ({ 
  selectedRate, 
  onBack,
  shipmentId: propShipmentId
}: ShippingRatesCardFooterProps) => {
  const form = useFormContext<ShipmentForm>();
  const [purchasing, setPurchasing] = useState(false);
  const navigate = useNavigate();
  
  const handlePurchaseLabel = async () => {
    if (!selectedRate) {
      toast.error("Please select a shipping rate first");
      return;
    }
    
    setPurchasing(true);
    // Get values from form context if available, otherwise use props
    const orderId = form?.getValues ? form.getValues("orderId") : undefined;
    const shipmentId = form?.getValues ? form.getValues("shipmentId") : propShipmentId;
    
    try {
      console.log('Purchasing label for shipment:', shipmentId, 'with rate:', selectedRate.id);
      
      if (!shipmentId) {
        throw new Error("No shipment ID found. Please create a shipment first.");
      }
      
      // Use the EasyPost service directly to purchase the label
      const labelData = await easyPostService.purchaseLabel(shipmentId, selectedRate.id);
      
      // Update the order status if an order ID is available
      if (orderId) {
        try {
          await orderService.updateOrderWithShipment(
            orderId, 
            shipmentId, 
            labelData.tracking_code || "Unknown"
          );
          console.log("Order updated successfully with shipment data:", labelData);
        } catch (orderError) {
          console.error("Error updating order:", orderError);
          // Continue even if order update fails
        }
      }
      
      toast.success("Shipping label purchased successfully!");
      
      // Store the purchased label data in sessionStorage for the Shipments page to use
      try {
        sessionStorage.setItem('lastPurchasedLabel', JSON.stringify(labelData));
      } catch (storageError) {
        console.error("Error storing label data:", storageError);
      }
      
      // Navigate to the Shipments page with the shipment ID as a query parameter
      // This will highlight the newly created shipment in the table
      setTimeout(() => {
        navigate(`/shipments?highlight=${shipmentId}`);
      }, 1000);
    } catch (error) {
      console.error("Error purchasing label:", error);
      
      // Improved error handling - check if there's a detailed error message from EasyPost
      let errorMessage = "Failed to purchase shipping label";
      
      // Try to extract detailed error message from the response
      if (error instanceof Error) {
        // Check if the error response contains details about missing phone number
        if (error.message.includes('non-2xx status code')) {
          errorMessage = "Validation error: The recipient needs a phone number. Please add a phone number to the shipping address.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setPurchasing(false);
    }
  };
  
  return (
    <CardFooter className="flex justify-between">
      <Button
        variant="outline"
        onClick={onBack}
      >
        Back to Shipment Details
      </Button>
      
      <Button 
        className="bg-tms-blue hover:bg-tms-blue-400"
        disabled={!selectedRate || purchasing}
        onClick={handlePurchaseLabel}
      >
        <Package className="mr-2 h-4 w-4" />
        {purchasing ? "Processing..." : "Purchase Label"}
      </Button>
    </CardFooter>
  );
};

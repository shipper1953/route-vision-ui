
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Scan, Info } from "lucide-react";

export const QboidStatusNotification = () => {
  const form = useFormContext<ShipmentForm>();
  
  // Check if we have an order ID and if dimensions are populated
  const orderId = form.getValues("orderId");
  const hasDimensions = form.getValues("length") && form.getValues("width") && form.getValues("height");
  
  // Only show the notification if we have an order but no dimensions
  if (orderId && !hasDimensions) {
    return (
      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <Scan className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Use Qboid to capture and upload dimensions or enter fields manually.
        </AlertDescription>
      </Alert>
    );
  }
  
  return null;
};

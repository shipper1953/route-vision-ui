
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";
import { CheckCircle2 } from "lucide-react";

interface PackageStatusMessageProps {
  orderId?: string;
}

export const PackageStatusMessage = ({ orderId }: PackageStatusMessageProps) => {
  const form = useFormContext<ShipmentForm>();
  
  // Show message if we have an order ID and dimensions are populated
  const hasOrderId = orderId || form.getValues("orderId");
  const hasDimensions = form.getValues("length") && form.getValues("width") && form.getValues("height");
  
  if (hasOrderId && hasDimensions) {
    return (
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-2">
        <CheckCircle2 size={16} className="text-blue-600 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800 font-medium">
            Package dimensions loaded from order
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Order #{hasOrderId}
          </p>
        </div>
      </div>
    );
  }
  
  return null;
};

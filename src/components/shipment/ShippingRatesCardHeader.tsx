
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShipmentForm } from "@/types/shipment";
import { useFormContext } from "react-hook-form";

export const ShippingRatesCardHeader = () => {
  const form = useFormContext<ShipmentForm>();
  const requiredDeliveryDate = form.getValues("requiredDeliveryDate");
  
  return (
    <CardHeader>
      <CardTitle>Shipping Rates</CardTitle>
      <CardDescription>
        Select a shipping rate to continue. SmartRate provides estimated transit times and delivery accuracy.
        {requiredDeliveryDate && (
          <span className="block mt-1 font-medium">
            Required delivery date: {new Date(requiredDeliveryDate).toLocaleDateString()}
          </span>
        )}
      </CardDescription>
    </CardHeader>
  );
};

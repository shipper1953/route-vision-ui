
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShipmentForm } from "@/types/shipment";
import { useFormContext } from "react-hook-form";

export const ShippingRatesCardHeader = () => {
  // Safely get form context, which might be null
  const form = useFormContext<ShipmentForm>();
  
  // Check if form exists before trying to access getValues
  const requiredDeliveryDate = form?.getValues ? form.getValues("requiredDeliveryDate") : undefined;
  
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

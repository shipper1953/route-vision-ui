
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardContent
} from "@/components/ui/card";
import { DimensionsSection } from "./package/DimensionsSection";
import { WeightSection } from "./package/WeightSection";
import { QboidStatusNotification } from "./package/QboidStatusNotification";
import { QboidDimensionsSync } from "./package/QboidDimensionsSync";
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";

export const PackageDetailsSection = () => {
  const form = useFormContext<ShipmentForm>();
  const orderId = form.getValues("orderId");
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Package Details</CardTitle>
            <CardDescription>Enter the package dimensions and weight</CardDescription>
          </div>
          <QboidDimensionsSync orderId={orderId} />
        </div>
      </CardHeader>
      <CardContent>
        <QboidStatusNotification />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <DimensionsSection />
          <WeightSection />
        </div>
      </CardContent>
    </Card>
  );
};

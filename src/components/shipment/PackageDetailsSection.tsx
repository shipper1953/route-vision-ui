
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DimensionsSection } from "./package/DimensionsSection";
import { WeightSection } from "./package/WeightSection";
import { QboidStatusNotification } from "./package/QboidStatusNotification";
import { QboidDimensionsSync } from "./package/QboidDimensionsSync";
import { CartonizationDialog } from "@/components/cartonization/CartonizationDialog";
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";
import { useCartonization } from "@/hooks/useCartonization";
import { useState } from "react";
import { Package, Calculator } from "lucide-react";
import { toast } from "sonner";

export const PackageDetailsSection = () => {
  const form = useFormContext<ShipmentForm>();
  const orderId = form.getValues("orderId");
  const [showCartonization, setShowCartonization] = useState(false);
  const { boxes, createItemsFromShipmentData } = useCartonization();
  
  const handleOptimizePackaging = () => {
    const formData = form.getValues();
    const items = createItemsFromShipmentData({
      length: formData.length,
      width: formData.width,
      height: formData.height,
      weight: formData.weight
    });

    if (items.length === 0) {
      toast.error('Please enter package dimensions and weight first');
      return;
    }

    setShowCartonization(true);
  };

  const handleSelectBox = (box: any) => {
    // Update form with selected box dimensions
    form.setValue("length", box.length);
    form.setValue("width", box.width);
    form.setValue("height", box.height);
    
    toast.success(`Selected ${box.name} for optimal packaging`);
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Package Details</CardTitle>
            <CardDescription>Enter the package dimensions and weight</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleOptimizePackaging}
              className="flex items-center gap-2"
            >
              <Calculator className="h-4 w-4" />
              Optimize Packaging
            </Button>
            <QboidDimensionsSync orderId={orderId} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <QboidStatusNotification />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <DimensionsSection />
          <WeightSection />
        </div>
      </CardContent>

      <CartonizationDialog
        isOpen={showCartonization}
        onClose={() => setShowCartonization(false)}
        items={createItemsFromShipmentData(form.getValues())}
        availableBoxes={boxes}
        onSelectBox={handleSelectBox}
      />
    </Card>
  );
};

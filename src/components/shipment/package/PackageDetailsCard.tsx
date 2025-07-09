import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";
import { DimensionsSection } from "./DimensionsSection";
import { WeightSection } from "./WeightSection";
import { QboidStatusNotification } from "./QboidStatusNotification";
import { QboidDimensionsSync } from "./QboidDimensionsSync";

interface PackageDetailsCardProps {
  orderItemsCount: number;
  orderId?: string;
  onOptimizePackaging: () => void;
}

export const PackageDetailsCard = ({
  orderItemsCount,
  orderId,
  onOptimizePackaging
}: PackageDetailsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Package Details</CardTitle>
            <CardDescription>Enter the package dimensions and weight</CardDescription>
            {orderItemsCount > 0 && (
              <p className="text-sm text-green-600 mt-1">
                {orderItemsCount} items loaded from order for packaging optimization
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onOptimizePackaging}
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
    </Card>
  );
};
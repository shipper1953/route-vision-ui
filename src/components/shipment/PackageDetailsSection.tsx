
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

export const PackageDetailsSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Package Details</CardTitle>
        <CardDescription>Enter the package dimensions and weight</CardDescription>
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

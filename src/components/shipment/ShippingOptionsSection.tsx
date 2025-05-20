
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardContent 
} from "@/components/ui/card";

export const ShippingOptionsSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping Options</CardTitle>
        <CardDescription>Additional shipping options and preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This demo uses SmartRate to calculate shipping rates with time-in-transit data.
          Additional options like insurance, signature confirmation, etc. would be configured here.
        </p>
      </CardContent>
    </Card>
  );
};

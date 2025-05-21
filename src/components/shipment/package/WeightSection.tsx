
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";
import {
  FormField,
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export const WeightSection = () => {
  const form = useFormContext<ShipmentForm>();
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Weight</h3>
        <span className="text-sm text-muted-foreground">in oz</span>
      </div>
      
      <FormField
        control={form.control}
        name="weight"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Weight</FormLabel>
            <FormControl>
              <Input type="number" step="0.1" {...field} />
            </FormControl>
            <FormDescription>
              For packages over 1lb, enter 16oz per pound (e.g., 2lbs = 32oz)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

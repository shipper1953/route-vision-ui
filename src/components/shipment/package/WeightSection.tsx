
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
  
  // Handle number conversion for weight input
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const value = e.target.value;
    if (value === '') {
      field.onChange(undefined); // Allow clearing the field
    } else {
      // Convert string input to number
      const numericValue = parseFloat(value);
      field.onChange(numericValue);
    }
  };
  
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
              <Input 
                type="number" 
                step="0.1" 
                onChange={(e) => handleWeightChange(e, field)}
                value={field.value || ''}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
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

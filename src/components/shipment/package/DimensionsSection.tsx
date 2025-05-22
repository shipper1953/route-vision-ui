
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";
import {
  FormField,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export const DimensionsSection = () => {
  const form = useFormContext<ShipmentForm>();
  
  // Handle number conversion for dimensions inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
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
        <h3 className="text-lg font-medium">Dimensions</h3>
        <span className="text-sm text-muted-foreground">in inches</span>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="length"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Length</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.1" 
                  onChange={(e) => handleInputChange(e, field)}
                  value={field.value || ''}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="width"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Width</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.1" 
                  onChange={(e) => handleInputChange(e, field)}
                  value={field.value || ''}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="height"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Height</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.1" 
                  onChange={(e) => handleInputChange(e, field)}
                  value={field.value || ''}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

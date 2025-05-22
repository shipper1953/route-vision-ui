
import { 
  FormField as HookFormField,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";

interface FormFieldProps {
  name: keyof ShipmentForm;
  label: string;
  placeholder: string;
  required?: boolean;
  type?: string;
}

export const FormField = ({ name, label, placeholder, required = false, type = "text" }: FormFieldProps) => {
  const form = useFormContext<ShipmentForm>();
  
  // Handle numeric inputs specifically
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const value = e.target.value;
    
    if (type === "number") {
      if (value === '') {
        field.onChange(undefined);
      } else {
        field.onChange(parseFloat(value));
      }
    } else {
      field.onChange(value);
    }
  };
  
  return (
    <HookFormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}{!required && " (Optional)"}</FormLabel>
          <FormControl>
            {type === "number" ? (
              <Input 
                type={type} 
                placeholder={placeholder} 
                onChange={(e) => handleInputChange(e, field)}
                value={field.value ?? ''}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            ) : (
              <Input 
                type={type}
                placeholder={placeholder} 
                {...field} 
                value={field.value?.toString() || ''} 
              />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

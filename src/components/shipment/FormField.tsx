
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
}

export const FormField = ({ name, label, placeholder, required = false }: FormFieldProps) => {
  const form = useFormContext<ShipmentForm>();
  
  return (
    <HookFormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}{!required && " (Optional)"}</FormLabel>
          <FormControl>
            <Input placeholder={placeholder} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

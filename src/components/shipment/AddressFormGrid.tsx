
import { FormField } from "./FormField";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormField as HookFormField,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";

interface AddressFormGridProps {
  prefix: "from" | "to";
}

export const AddressFormGrid = ({ prefix }: AddressFormGridProps) => {
  const form = useFormContext<ShipmentForm>();
  
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField 
          name={`${prefix}Name` as keyof ShipmentForm} 
          label="Name" 
          placeholder="Full name" 
          required
        />
        <FormField 
          name={`${prefix}Company` as keyof ShipmentForm} 
          label="Company" 
          placeholder="Company name" 
        />
      </div>
      
      <FormField 
        name={`${prefix}Street1` as keyof ShipmentForm} 
        label="Street Address" 
        placeholder="Street address" 
        required 
      />
      
      <FormField 
        name={`${prefix}Street2` as keyof ShipmentForm} 
        label="Street Address 2" 
        placeholder="Apt, suite, etc." 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField 
          name={`${prefix}City` as keyof ShipmentForm} 
          label="City" 
          placeholder="City" 
          required 
        />
        
        <FormField 
          name={`${prefix}State` as keyof ShipmentForm} 
          label="State" 
          placeholder="State" 
          required 
        />
        
        <FormField 
          name={`${prefix}Zip` as keyof ShipmentForm} 
          label="Zip Code" 
          placeholder="Zip code" 
          required 
        />
      </div>
      
      <HookFormField
        control={form.control}
        name={`${prefix}Country` as keyof ShipmentForm}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Country</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="CA">Canada</SelectItem>
                <SelectItem value="MX">Mexico</SelectItem>
                {prefix === "to" && <SelectItem value="GB">United Kingdom</SelectItem>}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField 
          name={`${prefix}Phone` as keyof ShipmentForm} 
          label="Phone" 
          placeholder="Phone number" 
        />
        
        <FormField 
          name={`${prefix}Email` as keyof ShipmentForm} 
          label="Email" 
          placeholder="Email address" 
        />
      </div>
    </>
  );
};

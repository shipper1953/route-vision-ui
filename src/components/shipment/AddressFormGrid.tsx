
import { FormField } from "./FormField";

interface AddressFormGridProps {
  prefix: "from" | "to";
}

export const AddressFormGrid = ({ prefix }: AddressFormGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        name={`${prefix}Name` as any}
        label="Name"
        placeholder="Full Name"
        required
      />
      
      <FormField
        name={`${prefix}Company` as any}
        label="Company"
        placeholder="Company Name"
      />
      
      <FormField
        name={`${prefix}Street1` as any}
        label="Street Address"
        placeholder="Street Address"
        required
      />
      
      <FormField
        name={`${prefix}Street2` as any}
        label="Apt/Suite"
        placeholder="Apartment, suite, etc."
      />
      
      <FormField
        name={`${prefix}City` as any}
        label="City"
        placeholder="City"
        required
      />
      
      <div className="grid grid-cols-2 gap-4">
        <FormField
          name={`${prefix}State` as any}
          label="State/Province"
          placeholder="State"
          required
        />
        
        <FormField
          name={`${prefix}Zip` as any}
          label="ZIP/Postal"
          placeholder="ZIP Code"
          required
        />
      </div>
      
      <FormField
        name={`${prefix}Country` as any}
        label="Country"
        placeholder="Country Code"
        required
      />
      
      <div className="grid grid-cols-2 gap-4">
        <FormField
          name={`${prefix}Phone` as any}
          label="Phone"
          placeholder="Phone Number"
        />
        
        <FormField
          name={`${prefix}Email` as any}
          label="Email"
          placeholder="Email Address"
        />
      </div>
    </div>
  );
};

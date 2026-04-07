import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderFormValues } from "@/types/order";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
}

export const CustomerSelectionSection = () => {
  const form = useFormContext<OrderFormValues>();
  const { userProfile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!userProfile?.company_id) return;
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, code, email')
        .eq('company_id', userProfile.company_id)
        .eq('is_active', true)
        .order('name');
      
      if (!error && data) {
        setCustomers(data);
      }
      setLoading(false);
    };
    fetchCustomers();
  }, [userProfile?.company_id]);

  const handleCustomerChange = (customerId: string) => {
    form.setValue("customerId", customerId);
    // Clear items when customer changes since items are customer-specific
    form.setValue("orderItems", []);
    
    // Auto-fill customer info
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      form.setValue("customerName", customer.name);
      if (customer.email) form.setValue("customerEmail", customer.email);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg flex items-center gap-2">
        <Users className="h-5 w-5" />
        Customer
      </h3>
      <FormField
        control={form.control}
        name="customerId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Select Customer*</FormLabel>
            <Select onValueChange={handleCustomerChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading customers..." : "Select a customer"} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{customer.name}</span>
                      {customer.code && (
                        <span className="text-sm text-muted-foreground">Code: {customer.code}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

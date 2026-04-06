
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Warehouse } from "@/types/auth";

export const WarehouseSelectionSection = () => {
  const { userProfile } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWarehouses = async () => {
      setLoading(true);
      
      try {
        let query = supabase
          .from('warehouses')
          .select('*');

        // Super admins without a company see all warehouses; others filter by company
        if (userProfile?.company_id) {
          query = query.eq('company_id', userProfile.company_id);
        }

        const { data, error } = await query.order('is_default', { ascending: false });

        if (!error && data) {
          setWarehouses(data);
        }
      } catch (error) {
        console.error('Error fetching warehouses:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userProfile) {
      fetchWarehouses();
    }
  }, [userProfile?.company_id, userProfile]);

  if (loading) {
    return <div>Loading warehouses...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">Warehouse Information</h3>
      
      <FormField
        name="warehouseId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Ship From Warehouse*</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} {warehouse.is_default ? "(Default)" : ""}
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

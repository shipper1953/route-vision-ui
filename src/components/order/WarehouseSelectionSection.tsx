
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Warehouse } from "@/types/auth";
import { useFormContext } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail } from "lucide-react";

export const WarehouseSelectionSection = () => {
  const { userProfile } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const form = useFormContext();

  useEffect(() => {
    const fetchWarehouses = async () => {
      setLoading(true);
      
      try {
        let query = supabase
          .from('warehouses')
          .select('*');

        if (userProfile?.company_id) {
          query = query.eq('company_id', userProfile.company_id);
        }

        const { data, error } = await query.order('is_default', { ascending: false }).order('name');

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

  // Auto-select default warehouse when warehouses load and no value is set
  useEffect(() => {
    if (warehouses.length > 0 && form) {
      const currentValue = form.getValues('warehouseId');
      if (!currentValue) {
        const defaultWarehouse = warehouses.find(w => w.is_default) || warehouses[0];
        if (defaultWarehouse) {
          form.setValue('warehouseId', defaultWarehouse.id);
        }
      }
    }
  }, [warehouses, form]);

  const selectedWarehouseId = form?.watch?.('warehouseId');
  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading warehouses...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">Ship From Warehouse</h3>
      
      <FormField
        name="warehouseId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Warehouse *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
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

      {/* Show selected warehouse details */}
      {selectedWarehouse && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">{selectedWarehouse.name}</span>
            {selectedWarehouse.is_default && (
              <Badge variant="secondary" className="text-xs">Default</Badge>
            )}
          </div>
          {selectedWarehouse.address && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                {selectedWarehouse.address.street1}
                {selectedWarehouse.address.street2 && `, ${selectedWarehouse.address.street2}`}
                <br />
                {selectedWarehouse.address.city}, {selectedWarehouse.address.state} {selectedWarehouse.address.zip}
              </span>
            </div>
          )}
          {selectedWarehouse.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{selectedWarehouse.phone}</span>
            </div>
          )}
          {selectedWarehouse.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{selectedWarehouse.email}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

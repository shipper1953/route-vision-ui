
import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Warehouse as WarehouseIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Warehouse } from "@/types/auth";

export const WarehouseAddressSelector = () => {
  const { userProfile } = useAuth();
  const form = useFormContext();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWarehouses = async () => {
      if (!userProfile?.company_id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('warehouses')
          .select('*')
          .eq('company_id', userProfile.company_id)
          .order('is_default', { ascending: false })
          .order('name');

        if (!error && data) {
          setWarehouses(data);
          // Auto-select default warehouse
          const defaultWh = data.find(w => w.is_default) || data[0];
          if (defaultWh) {
            setSelectedWarehouseId(defaultWh.id);
            populateFromWarehouse(defaultWh);
          }
        }
      } catch (error) {
        console.error('Error fetching warehouses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWarehouses();
  }, [userProfile?.company_id]);

  const populateFromWarehouse = (warehouse: Warehouse) => {
    if (!form || !warehouse) return;
    
    const addr = warehouse.address || {};
    form.setValue("fromName", warehouse.name || "");
    form.setValue("fromCompany", warehouse.name || "");
    form.setValue("fromStreet1", addr.street1 || "");
    form.setValue("fromStreet2", addr.street2 || "");
    form.setValue("fromCity", addr.city || "");
    form.setValue("fromState", addr.state || "");
    form.setValue("fromZip", addr.zip || "");
    form.setValue("fromCountry", addr.country || "US");
    form.setValue("fromPhone", warehouse.phone || "");
    form.setValue("fromEmail", warehouse.email || "");
  };

  const handleWarehouseChange = (warehouseId: string) => {
    setSelectedWarehouseId(warehouseId);
    const warehouse = warehouses.find(w => w.id === warehouseId);
    if (warehouse) {
      populateFromWarehouse(warehouse);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading warehouses...</div>
    );
  }

  if (warehouses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <WarehouseIcon className="h-4 w-4" />
        Ship From Warehouse
      </Label>
      <Select value={selectedWarehouseId} onValueChange={handleWarehouseChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select warehouse" />
        </SelectTrigger>
        <SelectContent>
          {warehouses.map((wh) => (
            <SelectItem key={wh.id} value={wh.id}>
              {wh.name} {wh.is_default ? "(Default)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Selecting a warehouse auto-fills the address, phone, and email below.
      </p>
    </div>
  );
};

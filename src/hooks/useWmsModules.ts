import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface WmsModules {
  receiving: boolean;
  quality: boolean;
  inventory: boolean;
  picking: boolean;
  reporting: boolean;
  warehouses: boolean;
  customers: boolean;
  purchaseOrders: boolean;
  locations: boolean;
}

const DEFAULT_MODULES: WmsModules = {
  receiving: true,
  quality: true,
  inventory: true,
  picking: true,
  reporting: true,
  warehouses: true,
  customers: true,
  purchaseOrders: true,
  locations: true,
};

const coerce = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

export const useWmsModules = () => {
  const { userProfile } = useAuth();
  const [modules, setModules] = useState<WmsModules>(DEFAULT_MODULES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchModules = async () => {
      if (!userProfile?.company_id) {
        setModules(DEFAULT_MODULES);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("company_wms_modules" as never)
          .select("*")
          .eq("company_id", userProfile.company_id)
          .maybeSingle();

        if (error) {
          console.warn("Falling back to default WMS modules:", error.message);
          setModules(DEFAULT_MODULES);
          return;
        }

        const row = data as Record<string, unknown> | null;
        setModules({
          receiving: coerce(row?.receiving_enabled, DEFAULT_MODULES.receiving),
          quality: coerce(row?.quality_enabled, DEFAULT_MODULES.quality),
          inventory: coerce(row?.inventory_enabled, DEFAULT_MODULES.inventory),
          picking: coerce(row?.picking_enabled, DEFAULT_MODULES.picking),
          reporting: coerce(row?.reporting_enabled, DEFAULT_MODULES.reporting),
          warehouses: coerce(row?.warehouses_enabled, DEFAULT_MODULES.warehouses),
          customers: coerce(row?.customers_enabled, DEFAULT_MODULES.customers),
          purchaseOrders: coerce(row?.purchase_orders_enabled, DEFAULT_MODULES.purchaseOrders),
          locations: coerce(row?.locations_enabled, DEFAULT_MODULES.locations),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, [userProfile?.company_id]);

  const hasAnyWmsModule = useMemo(
    () => Object.values(modules).some(Boolean),
    [modules],
  );

  return { modules, hasAnyWmsModule, loading };
};

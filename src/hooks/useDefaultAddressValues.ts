
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

export const useDefaultAddressValues = () => {
  const { user, userProfile } = useAuth();
  const [warehouseAddress, setWarehouseAddress] = useState<any>(null);

  useEffect(() => {
    const loadWarehouseAddress = async () => {
      if (!user?.id || !userProfile?.company_id) return;

      try {
        // Get user's assigned warehouse or company default warehouse
        let warehouseId = null;
        
        // First try to get user's assigned warehouse
        if (userProfile.warehouse_ids && Array.isArray(userProfile.warehouse_ids) && userProfile.warehouse_ids.length > 0) {
          warehouseId = String(userProfile.warehouse_ids[0]);
        } else {
          // Fall back to company default warehouse
          const { data: defaultWarehouse, error: defaultError } = await supabase
            .from('warehouses')
            .select('id')
            .eq('company_id', userProfile.company_id)
            .eq('is_default', true)
            .maybeSingle();
          
          if (defaultError) {
            console.error("Error fetching default warehouse:", defaultError);
          } else if (defaultWarehouse) {
            warehouseId = defaultWarehouse.id;
          }
        }

        if (warehouseId) {
          const { data: warehouse, error } = await supabase
            .from('warehouses')
            .select('name, address, phone, email')
            .eq('id', warehouseId)
            .maybeSingle();

          if (error) {
            console.error("Error fetching warehouse details:", error);
          } else if (warehouse?.address) {
            console.log("Loaded warehouse address:", warehouse);
            setWarehouseAddress({
              name: warehouse.name,
              address: warehouse.address,
              phone: warehouse.phone,
              email: warehouse.email
            });
          }
        }
      } catch (error) {
        console.error("Error loading warehouse address:", error);
      }
    };

    loadWarehouseAddress();
  }, [user?.id, userProfile?.company_id, userProfile?.warehouse_ids]);

  const getDefaultShippingAddress = () => {
    if (!warehouseAddress?.address) {
      return {
        fromName: "",
        fromCompany: "",
        fromStreet1: "",
        fromStreet2: "",
        fromCity: "",
        fromState: "",
        fromZip: "",
        fromCountry: "US",
        fromPhone: "",
        fromEmail: "",
      };
    }

    const addr = warehouseAddress.address;
    return {
      fromName: "Warehouse Manager", // Default name
      fromCompany: warehouseAddress.name || "Warehouse",
      fromStreet1: addr.street1 || "",
      fromStreet2: addr.street2 || "",
      fromCity: addr.city || "",
      fromState: addr.state || "",
      fromZip: addr.zip || "",
      fromCountry: addr.country || "US",
      fromPhone: warehouseAddress.phone || "",
      fromEmail: warehouseAddress.email || "",
    };
  };

  return {
    getDefaultShippingAddress,
    warehouseAddress,
  };
};

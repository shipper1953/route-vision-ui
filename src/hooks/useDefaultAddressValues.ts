
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
        let warehouseId = null;

        if (userProfile.warehouse_ids && Array.isArray(userProfile.warehouse_ids) && userProfile.warehouse_ids.length > 0) {
          const preferredWarehouseId = String(userProfile.warehouse_ids[0]);
          const { data: assignedWarehouse, error: assignedWarehouseError } = await supabase
            .from('warehouses')
            .select('id, name, address, phone, email')
            .eq('id', preferredWarehouseId)
            .eq('company_id', userProfile.company_id)
            .maybeSingle();

          if (assignedWarehouseError) {
            console.error("Error fetching assigned warehouse details:", assignedWarehouseError);
          }

          if (assignedWarehouse) {
            warehouseId = assignedWarehouse.id;
            if (assignedWarehouse.address) {
              console.log("Loaded assigned warehouse address:", assignedWarehouse);
              setWarehouseAddress({
                name: assignedWarehouse.name,
                address: assignedWarehouse.address,
                phone: assignedWarehouse.phone,
                email: assignedWarehouse.email
              });
              return;
            }
          } else {
            console.warn("Assigned warehouse does not belong to the current company, falling back to company default warehouse", {
              preferredWarehouseId,
              companyId: userProfile.company_id,
            });
          }
        }

        const { data: defaultWarehouse, error: defaultError } = await supabase
          .from('warehouses')
          .select('id, name, address, phone, email')
          .eq('company_id', userProfile.company_id)
          .eq('is_default', true)
          .maybeSingle();
        
        if (defaultError) {
          console.error("Error fetching default warehouse:", defaultError);
        } else if (defaultWarehouse?.address) {
          warehouseId = defaultWarehouse.id;
          console.log("Loaded company default warehouse address:", defaultWarehouse);
          setWarehouseAddress({
            name: defaultWarehouse.name,
            address: defaultWarehouse.address,
            phone: defaultWarehouse.phone,
            email: defaultWarehouse.email
          });
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

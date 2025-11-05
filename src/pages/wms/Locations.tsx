import { useState, useEffect } from "react";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { BinLocationManager } from "@/components/wms/locations/BinLocationManager";
import { useAuth } from "@/hooks/useAuth";

export default function Locations() {
  const { userProfile } = useAuth();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");

  useEffect(() => {
    // Extract warehouse ID from user profile
    if (userProfile?.warehouse_ids) {
      const warehouseIds = userProfile.warehouse_ids as any;
      if (Array.isArray(warehouseIds) && warehouseIds.length > 0) {
        const firstId = warehouseIds[0];
        if (typeof firstId === 'string') {
          setSelectedWarehouse(firstId);
        } else if (firstId && typeof firstId === 'object' && firstId.id) {
          setSelectedWarehouse(firstId.id);
        }
      }
    }
  }, [userProfile]);

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Warehouse Locations</h1>
            <p className="text-muted-foreground">Manage bin locations and inventory transfers</p>
          </div>
        </div>
        {selectedWarehouse ? (
          <BinLocationManager warehouseId={selectedWarehouse} />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No warehouse assigned. Please contact your administrator.</p>
          </div>
        )}
      </div>
    </TmsLayout>
  );
}

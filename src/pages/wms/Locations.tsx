import { TmsLayout } from "@/components/layout/TmsLayout";
import { BinLocationManager } from "@/components/wms/locations/BinLocationManager";
import { useLocation } from "react-router-dom";

export default function Locations() {
  const location = useLocation();
  const isPutawayRoute = location.pathname === "/wms/putaway";

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{isPutawayRoute ? "Putaway" : "Warehouse Locations"}</h1>
            <p className="text-muted-foreground">
              {isPutawayRoute
                ? "Manage inbound putaway tasks and route received inventory into picking or storage bins"
                : "Manage bin locations and inventory transfers across all warehouses"}
            </p>
          </div>
        </div>
        <BinLocationManager />
      </div>
    </TmsLayout>
  );
}

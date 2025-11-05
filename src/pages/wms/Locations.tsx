import { TmsLayout } from "@/components/layout/TmsLayout";
import { BinLocationManager } from "@/components/wms/locations/BinLocationManager";

export default function Locations() {
  return (
    <TmsLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Warehouse Locations</h1>
            <p className="text-muted-foreground">Manage bin locations and inventory transfers across all warehouses</p>
          </div>
        </div>
        <BinLocationManager />
      </div>
    </TmsLayout>
  );
}

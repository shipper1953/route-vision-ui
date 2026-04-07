import { TmsLayout } from "@/components/layout/TmsLayout";
import { WarehouseManagement } from "@/components/admin/WarehouseManagement";
import { useAuth } from "@/hooks/useAuth";

export default function Warehouses() {
  const { userProfile } = useAuth();

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Warehouses</h1>
          <p className="text-muted-foreground">Create, edit and manage your warehouse locations</p>
        </div>
        <WarehouseManagement companyId={userProfile?.company_id} />
      </div>
    </TmsLayout>
  );
}


import { useAuth } from "@/context";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { RoleManager } from "@/components/admin/RoleManager";
import { Navigate } from "react-router-dom";
import { Shield } from "lucide-react";

const AdminPanel = () => {
  const { isAdmin, loading } = useAuth();

  // Show loading state while checking auth
  if (loading) {
    return (
      <TmsLayout>
        <div className="flex items-center justify-center min-h-64">
          <div>Loading...</div>
        </div>
      </TmsLayout>
    );
  }

  // Redirect non-admin users
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <TmsLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-tms-blue" />
            <h1 className="text-2xl font-bold text-tms-blue">Admin Panel</h1>
          </div>
          <p className="text-muted-foreground">Manage users and system settings</p>
        </div>
      </div>

      <div className="space-y-6">
        <RoleManager />
      </div>
    </TmsLayout>
  );
};

export default AdminPanel;

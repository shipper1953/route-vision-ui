
import { useAuth } from "@/context";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CompanyManagement } from "@/components/admin/CompanyManagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Wallet } from "lucide-react";

const SuperAdminPanel = () => {
  const { isAuthenticated, isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!isAuthenticated || !isSuperAdmin)) {
      navigate('/login');
    }
  }, [isAuthenticated, isSuperAdmin, loading, navigate]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tms-navy mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not super admin
  if (!isAuthenticated || !isSuperAdmin) {
    return null;
  }

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Super Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage companies, users, and system-wide settings
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Active companies</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Across all companies</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$--</div>
              <p className="text-xs text-muted-foreground">System-wide revenue</p>
            </CardContent>
          </Card>
        </div>

        <CompanyManagement />
      </div>
    </TmsLayout>
  );
};

export default SuperAdminPanel;

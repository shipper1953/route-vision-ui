
import { useAuth } from "@/context";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CompanyManagement } from "@/components/admin/CompanyManagement";
import { SuperAdminUserCreation } from "@/components/admin/SuperAdminUserCreation";
import { SuperAdminShipmentsReport } from "@/components/admin/SuperAdminShipmentsReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SuperAdminPanel = () => {
  const { isAuthenticated, isSuperAdmin, loading, userProfile } = useAuth();
  const navigate = useNavigate();

  // Add debug logging
  useEffect(() => {
    console.log('SuperAdminPanel - Auth state:', {
      isAuthenticated,
      isSuperAdmin,
      loading,
      userProfile: userProfile ? {
        role: userProfile.role,
        email: userProfile.email
      } : null
    });
  }, [isAuthenticated, isSuperAdmin, loading, userProfile]);

  useEffect(() => {
    if (!loading && (!isAuthenticated || !isSuperAdmin)) {
      console.log('SuperAdminPanel - Redirecting to login because:', {
        notAuthenticated: !isAuthenticated,
        notSuperAdmin: !isSuperAdmin,
        loading
      });
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

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="shipments">Shipments Report</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="space-y-4">
            <SuperAdminUserCreation />
          </TabsContent>
          
          <TabsContent value="companies" className="space-y-4">
            <CompanyManagement />
          </TabsContent>
          
          <TabsContent value="shipments" className="space-y-4">
            <SuperAdminShipmentsReport />
          </TabsContent>
        </Tabs>
      </div>
    </TmsLayout>
  );
};

export default SuperAdminPanel;

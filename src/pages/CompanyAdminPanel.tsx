
import { useAuth } from "@/context";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CompanyProfile } from "@/components/admin/CompanyProfile";
import { WarehouseManagement } from "@/components/admin/WarehouseManagement";
import { WalletManagement } from "@/components/admin/WalletManagement";
import { UserManagement } from "@/components/admin/UserManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CompanyAdminPanel = () => {
  const { isAuthenticated, isCompanyAdmin, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!isAuthenticated || !isCompanyAdmin)) {
      navigate('/login');
    }
  }, [isAuthenticated, isCompanyAdmin, loading, navigate]);

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

  // Don't render if not authenticated or not company admin
  if (!isAuthenticated || !isCompanyAdmin) {
    return null;
  }

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Company Administration</h1>
          <p className="text-muted-foreground">
            Manage your company settings, users, and operations
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Company Profile</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
            <TabsTrigger value="wallet">Wallet & Billing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <CompanyProfile companyId={userProfile?.company_id} />
          </TabsContent>
          
          <TabsContent value="users">
            <UserManagement companyId={userProfile?.company_id} />
          </TabsContent>
          
          <TabsContent value="warehouses">
            <WarehouseManagement companyId={userProfile?.company_id} />
          </TabsContent>
          
          <TabsContent value="wallet">
            <WalletManagement companyId={userProfile?.company_id} />
          </TabsContent>
        </Tabs>
      </div>
    </TmsLayout>
  );
};

export default CompanyAdminPanel;

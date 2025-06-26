
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { NotificationsForm } from "@/components/settings/NotificationsForm";
import { SecurityPlaceholder } from "@/components/settings/SecurityPlaceholder";
import { CartonizationSettings } from "@/components/settings/CartonizationSettings";

const Settings = () => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';

  // Check if we're in the packaging section
  const isPackagingSection = activeTab === 'packaging' || activeTab === 'box-demand' || activeTab === 'historical-usage' || activeTab === 'box-inventory' || activeTab === 'packaging-rules';

  if (isPackagingSection) {
    return (
      <TmsLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-tms-blue">Tornado Pack</h1>
            <p className="text-muted-foreground">
              Smart packaging recommendations and inventory management
            </p>
          </div>

          <Tabs value={activeTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="box-demand">Box Demand Planning</TabsTrigger>
              <TabsTrigger value="historical-usage">Historical Box Usage</TabsTrigger>
              <TabsTrigger value="box-inventory">Box Inventory Management</TabsTrigger>
              <TabsTrigger value="packaging-rules">Packaging Rules</TabsTrigger>
            </TabsList>
            
            <TabsContent value="box-demand" className="space-y-4">
              <CartonizationSettings />
            </TabsContent>
            
            <TabsContent value="historical-usage" className="space-y-4">
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold mb-2">Historical Box Usage</h3>
                <p className="text-muted-foreground">Analytics and trends for box usage over time</p>
              </div>
            </TabsContent>
            
            <TabsContent value="box-inventory" className="space-y-4">
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold mb-2">Box Inventory Management</h3>
                <p className="text-muted-foreground">Manage your packaging inventory and stock levels</p>
              </div>
            </TabsContent>
            
            <TabsContent value="packaging-rules" className="space-y-4">
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold mb-2">Packaging Rules</h3>
                <p className="text-muted-foreground">Configure automated packaging selection rules</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </TmsLayout>
    );
  }

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-tms-blue">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>

        <Tabs value={activeTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="packaging">Tornado Pack</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4">
            <ProfileForm />
          </TabsContent>
          
          <TabsContent value="notifications" className="space-y-4">
            <NotificationsForm />
          </TabsContent>
          
          <TabsContent value="security" className="space-y-4">
            <SecurityPlaceholder />
          </TabsContent>
          
          <TabsContent value="packaging" className="space-y-4">
            <CartonizationSettings />
          </TabsContent>
        </Tabs>
      </div>
    </TmsLayout>
  );
};

export default Settings;


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
            <TabsTrigger value="packaging">Packaging</TabsTrigger>
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

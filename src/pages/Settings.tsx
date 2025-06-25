
import { useState } from "react";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { NotificationsForm } from "@/components/settings/NotificationsForm";
import { SecurityPlaceholder } from "@/components/settings/SecurityPlaceholder";
import { CartonizationSettings } from "@/components/settings/CartonizationSettings";

const Settings = () => {
  return (
    <TmsLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tms-blue">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>
            Manage your profile, notifications, and system preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="cartonization">Packaging</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="mt-6">
              <ProfileForm />
            </TabsContent>
            
            <TabsContent value="notifications" className="mt-6">
              <NotificationsForm />
            </TabsContent>
            
            <TabsContent value="security" className="mt-6">
              <SecurityPlaceholder />
            </TabsContent>
            
            <TabsContent value="cartonization" className="mt-6">
              <CartonizationSettings />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TmsLayout>
  );
};

export default Settings;

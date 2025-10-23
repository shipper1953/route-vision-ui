import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Video, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useShopifySettings } from "@/hooks/useShopifySettings";
import { ShopifyConnectionCard } from "./ShopifyConnectionCard";
import { ShopifyOrderSyncSettings } from "./ShopifyOrderSyncSettings";
import { ShopifyFulfillmentSettings } from "./ShopifyFulfillmentSettings";
import { ShopifyInventorySettings } from "./ShopifyInventorySettings";
import { ShopifyProductSettings } from "./ShopifyProductSettings";
import { ShopifyAdvancedSettings } from "./ShopifyAdvancedSettings";
import { ShopifySyncLogViewer } from "./ShopifySyncLogViewer";
import { PrivacyPolicyCard } from "./PrivacyPolicyCard";

interface ShopifyIntegrationSettingsProps {
  companyId?: string;
}

export const ShopifyIntegrationSettings = ({ companyId }: ShopifyIntegrationSettingsProps) => {
  const navigate = useNavigate();
  const { settings, loading, saving, updateSettings, refetch } = useShopifySettings(companyId);
  const [activeTab, setActiveTab] = useState("connection");
  const [hasChanges, setHasChanges] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Shopify Integration</h2>
        <p className="text-muted-foreground">
          Manage your Shopify connection and sync settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="fulfillment">Fulfillment</TabsTrigger>
          <TabsTrigger value="inventory">
            Inventory
          </TabsTrigger>
          <TabsTrigger value="products">
            Products
          </TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="logs">Sync Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="connection">
          <div className="space-y-6">
            <ShopifyConnectionCard 
              companyId={companyId} 
              settings={settings}
              onRefresh={refetch}
            />
            
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      <Video className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Demo & Onboarding Guide</CardTitle>
                      <CardDescription>
                        Interactive walkthrough for demonstrations and training
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Access the step-by-step onboarding page to create screencasts, demos, or train new team members on the Shopify integration workflow.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => navigate('/onboarding')}
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Onboarding Guide
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => window.open(`${window.location.origin}/onboarding`, '_blank')}
                      className="gap-2"
                    >
                      Open in New Tab
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    URL for screencasts: <code className="px-1 py-0.5 bg-muted rounded text-xs">{window.location.origin}/onboarding</code>
                  </p>
                </div>
              </CardContent>
            </Card>

            <PrivacyPolicyCard />
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <ShopifyOrderSyncSettings
            settings={settings}
            onUpdate={(newSettings) => {
              updateSettings(newSettings);
              setHasChanges(false);
            }}
            onChange={() => setHasChanges(true)}
            companyId={companyId}
          />
        </TabsContent>

        <TabsContent value="fulfillment">
          <ShopifyFulfillmentSettings
            settings={settings}
            onUpdate={(newSettings) => {
              updateSettings(newSettings);
              setHasChanges(false);
            }}
            onChange={() => setHasChanges(true)}
            companyId={companyId}
          />
        </TabsContent>

        <TabsContent value="inventory">
          <ShopifyInventorySettings
            settings={settings}
            onUpdate={(newSettings) => {
              updateSettings(newSettings);
              setHasChanges(false);
            }}
            onChange={() => setHasChanges(true)}
            companyId={companyId}
          />
        </TabsContent>

        <TabsContent value="products">
          <ShopifyProductSettings
            settings={settings}
            onUpdate={(newSettings) => {
              updateSettings(newSettings);
              setHasChanges(false);
            }}
            onChange={() => setHasChanges(true)}
            companyId={companyId}
          />
        </TabsContent>

        <TabsContent value="advanced">
          <ShopifyAdvancedSettings
            settings={settings}
            onUpdate={(newSettings) => {
              updateSettings(newSettings);
              setHasChanges(false);
            }}
            onChange={() => setHasChanges(true)}
            companyId={companyId}
          />
        </TabsContent>

        <TabsContent value="logs">
          <ShopifySyncLogViewer companyId={companyId} />
        </TabsContent>
      </Tabs>

      {hasChanges && (
        <Card className="fixed bottom-4 right-4 p-4 shadow-lg">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">You have unsaved changes</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                refetch();
                setHasChanges(false);
              }}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => updateSettings(settings)} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

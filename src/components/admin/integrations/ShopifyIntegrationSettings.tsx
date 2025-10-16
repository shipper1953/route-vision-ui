import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useShopifySettings } from "@/hooks/useShopifySettings";
import { ShopifyConnectionCard } from "./ShopifyConnectionCard";
import { ShopifyOrderSyncSettings } from "./ShopifyOrderSyncSettings";
import { ShopifyFulfillmentSettings } from "./ShopifyFulfillmentSettings";
import { ShopifyInventorySettings } from "./ShopifyInventorySettings";
import { ShopifyProductSettings } from "./ShopifyProductSettings";
import { ShopifyAdvancedSettings } from "./ShopifyAdvancedSettings";
import { ShopifySyncLogViewer } from "./ShopifySyncLogViewer";

interface ShopifyIntegrationSettingsProps {
  companyId?: string;
}

export const ShopifyIntegrationSettings = ({ companyId }: ShopifyIntegrationSettingsProps) => {
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
          <TabsTrigger value="inventory" disabled={!settings.features.inventory_sync}>
            Inventory
          </TabsTrigger>
          <TabsTrigger value="products" disabled={!settings.features.product_sync}>
            Products
          </TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="logs">Sync Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="connection">
          <ShopifyConnectionCard 
            companyId={companyId} 
            settings={settings}
            onRefresh={refetch}
          />
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

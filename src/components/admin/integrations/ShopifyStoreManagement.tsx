import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useShopifyStores } from "@/hooks/useShopifyStores";
import { ShopifyStoreCard } from "./ShopifyStoreCard";
import { useState } from "react";
import { ShopifyConnectionDialog } from "@/components/integrations/ShopifyConnectionDialog";
import { useAuth } from "@/hooks/useAuth";

export const ShopifyStoreManagement = () => {
  const { userProfile } = useAuth();
  const { stores, loading, disconnectStore, syncStore, registerWebhooks } = useShopifyStores();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const handleDisconnect = async (storeId: string) => {
    if (confirm('Are you sure you want to disconnect this store?')) {
      await disconnectStore(storeId);
    }
  };

  const handleConfigure = (storeId: string) => {
    setSelectedStoreId(storeId);
    console.log('Configure store:', storeId);
  };

  const handleRegisterWebhooks = async (storeId: string) => {
    try {
      await registerWebhooks(storeId);
    } catch (error) {
      console.error('Failed to register webhooks:', error);
    }
  };

  if (loading) {
    return <div>Loading stores...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Connected Stores</CardTitle>
            <CardDescription>
              Manage multiple Shopify stores for your 3PL operations
            </CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Store
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {stores.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No stores connected yet.</p>
            <p className="text-sm mt-2">Click "Add Store" to connect your first Shopify store.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <ShopifyStoreCard
                key={store.id}
                store={store}
                onDisconnect={handleDisconnect}
                onSync={syncStore}
                onConfigure={handleConfigure}
                onRegisterWebhooks={handleRegisterWebhooks}
              />
            ))}
          </div>
        )}
      </CardContent>

      <ShopifyConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companyId={userProfile?.company_id}
        onSuccess={() => {
          setDialogOpen(false);
        }}
      />
    </Card>
  );
};

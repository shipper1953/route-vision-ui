import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, RefreshCw, Store } from "lucide-react";
import { ShopifyConnectionDialog } from "@/components/integrations/ShopifyConnectionDialog";
import { useState } from "react";
import { useShopifyConnection } from "@/hooks/useShopifyConnection";
import { ShopifySettings } from "@/hooks/useShopifySettings";

interface ShopifyConnectionCardProps {
  companyId?: string;
  settings: ShopifySettings;
  onRefresh: () => void;
}

export const ShopifyConnectionCard = ({ companyId, settings, onRefresh }: ShopifyConnectionCardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { disconnect, loading: disconnecting } = useShopifyConnection();
  const { connection } = settings;

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect from Shopify? This will stop all sync operations.')) {
      await disconnect();
      onRefresh();
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Shopify Connection
              </CardTitle>
              <CardDescription>
                Manage your Shopify store connection and credentials
              </CardDescription>
            </div>
            {connection.connected ? (
              <Badge variant="outline" className="gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Disconnected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {connection.connected ? (
            <>
              <div className="grid gap-4">
                <div>
                  <p className="text-sm font-medium">Store URL</p>
                  <p className="text-sm text-muted-foreground">{connection.store_url}</p>
                </div>
                {connection.connected_at && (
                  <div>
                    <p className="text-sm font-medium">Connected Since</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(connection.connected_at).toLocaleString()}
                    </p>
                  </div>
                )}
                {connection.last_sync && (
                  <div>
                    <p className="text-sm font-medium">Last Sync</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(connection.last_sync).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" size="sm" onClick={onRefresh}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  Disconnect
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">
                No Shopify store connected. Connect your store to enable order sync and fulfillment updates.
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Store className="mr-2 h-4 w-4" />
                Connect Shopify Store
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {companyId && (
        <ShopifyConnectionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          companyId={companyId}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
};

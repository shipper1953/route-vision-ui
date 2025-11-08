import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, RefreshCw, Unplug, Calendar, Settings } from "lucide-react";
import { ShopifyStore } from "@/hooks/useShopifyStores";
import { formatDistanceToNow } from "date-fns";

interface ShopifyStoreCardProps {
  store: ShopifyStore;
  onDisconnect: (storeId: string) => void;
  onSync: (storeId: string) => void;
  onConfigure: (storeId: string) => void;
}

export const ShopifyStoreCard = ({ 
  store, 
  onDisconnect, 
  onSync, 
  onConfigure 
}: ShopifyStoreCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              {store.customer_name || store.store_url}
            </CardTitle>
          </div>
          <Badge variant={store.is_active ? "default" : "secondary"}>
            {store.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Store URL:</span>
            <span className="font-mono text-xs">{store.store_url}</span>
          </div>
          
          {store.customer_reference && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reference:</span>
              <span>{store.customer_reference}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Connected:</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(store.connected_at), { addSuffix: true })}
            </span>
          </div>
          
          {store.last_sync_at && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Last Sync:</span>
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                {formatDistanceToNow(new Date(store.last_sync_at), { addSuffix: true })}
              </span>
            </div>
          )}

          {store.fulfillment_service_id && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fulfillment:</span>
              <span className="text-xs text-green-600">Registered</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onSync(store.id)}
            className="flex-1"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onConfigure(store.id)}
            className="flex-1"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => onDisconnect(store.id)}
          >
            <Unplug className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

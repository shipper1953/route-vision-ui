import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, RefreshCw, Unplug, Calendar, Settings, Building2, User, Webhook } from "lucide-react";
import { ShopifyStore } from "@/hooks/useShopifyStores";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ShopifyStoreCardProps {
  store: ShopifyStore;
  onDisconnect: (storeId: string) => void;
  onSync: (storeId: string) => void;
  onConfigure: (storeId: string) => void;
  onRegisterWebhooks: (storeId: string) => void;
}

export const ShopifyStoreCard = ({ 
  store, 
  onDisconnect, 
  onSync, 
  onConfigure,
  onRegisterWebhooks 
}: ShopifyStoreCardProps) => {
  const { isSuperAdmin } = useAuth();
  const [companyName, setCompanyName] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");

  // Fetch company name for super admins
  useEffect(() => {
    const fetchCompanyName = async () => {
      if (isSuperAdmin && store.company_id) {
        const { data } = await supabase
          .from('companies')
          .select('name')
          .eq('id', store.company_id)
          .single();
        
        if (data) {
          setCompanyName(data.name);
        }
      }
    };
    
    fetchCompanyName();
  }, [isSuperAdmin, store.company_id]);

  // Fetch customer name if customer_id exists
  useEffect(() => {
    const fetchCustomerName = async () => {
      if (store.customer_id) {
        const { data } = await supabase
          .from('customers')
          .select('name')
          .eq('id', store.customer_id)
          .single();
        
        if (data) {
          setCustomerName(data.name);
        }
      }
    };
    
    fetchCustomerName();
  }, [store.customer_id]);

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
          {isSuperAdmin && companyName && (
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Company:
              </span>
              <span className="font-medium">{companyName}</span>
            </div>
          )}
          
          {customerName && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                Customer:
              </span>
              <Badge variant="outline" className="gap-1">
                {customerName}
              </Badge>
            </div>
          )}
          
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

        <div className="flex flex-col gap-2 pt-2">
          <div className="flex gap-2">
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
              onClick={() => onRegisterWebhooks(store.id)}
              className="flex-1"
            >
              <Webhook className="h-4 w-4 mr-2" />
              Register Webhooks
            </Button>
          </div>
          <div className="flex gap-2">
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
        </div>
      </CardContent>
    </Card>
  );
};

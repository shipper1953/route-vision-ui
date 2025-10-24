import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, RefreshCw, Store, Truck, Info } from "lucide-react";
import { ShopifyConnectionDialog } from "@/components/integrations/ShopifyConnectionDialog";
import { useState } from "react";
import { useShopifyConnection } from "@/hooks/useShopifyConnection";
import { ShopifySettings } from "@/hooks/useShopifySettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ShopifyConnectionCardProps {
  companyId?: string;
  settings: ShopifySettings;
  onRefresh: () => void;
}

export const ShopifyConnectionCard = ({ companyId, settings, onRefresh }: ShopifyConnectionCardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { disconnect, loading: disconnecting } = useShopifyConnection();
  const { connection } = settings;
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect from Shopify? This will stop all sync operations.')) {
      await disconnect();
      onRefresh();
    }
  };

  const handleSyncFulfillments = async () => {
    setSyncing(true);
    try {
      // Find all shipped orders from Shopify that have tracking but aren't synced
      const { data: orderShipments, error } = await supabase
        .from('order_shipments')
        .select(`
          order_id,
          shipment_id,
          package_info
        `)

      if (error) throw error;

      // Get full shipment and order details
      const enrichedShipments = await Promise.all(
        (orderShipments || []).map(async (os) => {
          const [shipmentRes, orderRes] = await Promise.all([
            supabase.from('shipments').select('tracking_number, carrier, service, tracking_url').eq('id', os.shipment_id).single(),
            supabase.from('orders').select('company_id').eq('id', os.order_id).single()
          ]);
          
          return {
            ...os,
            shipments: shipmentRes.data,
            orders: orderRes.data
          };
        })
      );

      // Filter to only this company's orders with tracking
      const filteredShipments = enrichedShipments.filter(
        os => os.orders?.company_id === companyId && os.shipments?.tracking_number
      );

      if (!filteredShipments || filteredShipments.length === 0) {
        toast({
          title: "No shipments to sync",
          description: "No shipped orders with tracking found",
        });
        setSyncing(false);
        return;
      }

      console.log(`Found ${filteredShipments.length} shipments to sync with Shopify`);
      
      let successCount = 0;
      let errorCount = 0;

      // Sync each shipment
      let skippedCount = 0;
      for (const orderShipment of filteredShipments) {
        try {
          const { data, error: syncError } = await supabase.functions.invoke('shopify-update-fulfillment', {
            body: {
              shipmentId: orderShipment.shipment_id,
              status: 'purchased',
              trackingNumber: orderShipment.shipments.tracking_number,
              trackingUrl: orderShipment.shipments.tracking_url || '',
              carrier: orderShipment.shipments.carrier || 'Unknown',
              service: orderShipment.shipments.service || '',
            }
          });

          if (syncError) {
            console.error(`Failed to sync shipment ${orderShipment.shipment_id}:`, syncError);
            errorCount++;
          } else if (data?.skipped) {
            skippedCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`Error syncing shipment ${orderShipment.shipment_id}:`, err);
          errorCount++;
        }
      }

      const resultMessage = [
        successCount > 0 ? `${successCount} synced` : null,
        skippedCount > 0 ? `${skippedCount} skipped (not from Shopify)` : null,
        errorCount > 0 ? `${errorCount} errors` : null,
      ].filter(Boolean).join(', ');

      toast({
        title: "Fulfillment sync complete",
        description: resultMessage,
        variant: errorCount > 0 ? "destructive" : "default",
      });

    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
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
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>How Orders Sync</AlertTitle>
                <AlertDescription>
                  Orders appear in Ship Tornado after you click "Request fulfillment" in Shopify. 
                  This ensures you control which orders to fulfill through Ship Tornado.
                </AlertDescription>
              </Alert>

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
                  variant="outline" 
                  size="sm" 
                  onClick={handleSyncFulfillments}
                  disabled={syncing}
                >
                  <Truck className="mr-2 h-4 w-4" />
                  {syncing ? 'Syncing...' : 'Sync Fulfillments'}
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

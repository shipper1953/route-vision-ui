import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useShopifySyncLogs } from "@/hooks/useShopifySyncLogs";
import { useShopifyStores } from "@/hooks/useShopifyStores";
import { formatDistanceToNow } from "date-fns";
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { ShopifyStoreSelector } from "@/components/integrations/ShopifyStoreSelector";

interface ShopifySyncLogViewerProps {
  companyId?: string;
}

export const ShopifySyncLogViewer = ({ companyId }: ShopifySyncLogViewerProps) => {
  const { activeStoreId, stores } = useShopifyStores(companyId);
  const { logs, loading } = useShopifySyncLogs(activeStoreId || undefined);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getDirectionIcon = (direction: string) => {
    if (direction === 'inbound') {
      return <ArrowDownToLine className="h-4 w-4 text-blue-600" />;
    }
    return <ArrowUpFromLine className="h-4 w-4 text-purple-600" />;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sync Logs</CardTitle>
            <CardDescription>
              Recent synchronization activity
              {stores.length > 1 && activeStoreId && (
                <span className="ml-2 text-primary">
                  (filtered by selected store)
                </span>
              )}
            </CardDescription>
          </div>
          {stores.length > 1 && <ShopifyStoreSelector />}
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No sync logs yet
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex gap-2 mt-1">
                  {getStatusIcon(log.status)}
                  {getDirectionIcon(log.direction)}
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{log.sync_type}</span>
                    <Badge variant="outline" className="text-xs">
                      {log.direction}
                    </Badge>
                    {log.shopify_order_id && (
                      <span className="text-xs text-muted-foreground">
                        Order: {log.shopify_order_id}
                      </span>
                    )}
                  </div>
                  
                  {log.error_message && (
                    <p className="text-sm text-red-600">{log.error_message}</p>
                  )}
                  
                  {log.metadata && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {log.metadata.orders_synced && (
                        <div>Orders synced: {log.metadata.orders_synced}</div>
                      )}
                      {log.metadata.store_url && (
                        <div>Store: {log.metadata.store_url}</div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

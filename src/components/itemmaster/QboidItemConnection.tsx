import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Package, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QboidDimensions {
  length: number;
  width: number;
  height: number;
  weight: number;
}

interface QboidStatus {
  connected: boolean;
  lastScan?: string;
  pendingDimensions?: QboidDimensions;
  lastUpdatedItem?: {
    sku: string;
    name: string;
  };
}

export const QboidItemConnection = () => {
  const [status, setStatus] = useState<QboidStatus>({ connected: false });

  useEffect(() => {
    const channel = supabase
      .channel('qboid-item-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'qboid_events'
        },
        (payload: any) => {
          console.log('Qboid event received:', payload);
          const eventData = payload.new;

          if (eventData.event_type === 'dimensions_pending') {
            setStatus({
              connected: true,
              lastScan: new Date().toLocaleString(),
              pendingDimensions: eventData.data.dimensions
            });
            toast.info('Dimensions captured! Scan barcode to link to item.');
          } else if (eventData.event_type === 'item_dimensions_updated') {
            setStatus({
              connected: true,
              lastScan: new Date().toLocaleString(),
              lastUpdatedItem: {
                sku: eventData.data.sku,
                name: eventData.data.name || eventData.data.sku
              }
            });
            toast.success(`Item ${eventData.data.sku} dimensions updated!`);
          } else if (eventData.event_type === 'item_sku_not_found') {
            setStatus({
              connected: true,
              lastScan: new Date().toLocaleString()
            });
            toast.error(`SKU ${eventData.data.sku} not found in catalog`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <span>Qboid Dimension Capture</span>
          </div>
          <Badge variant={status.connected ? "default" : "secondary"}>
            {status.connected ? "Connected" : "Waiting"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {status.lastScan && (
            <div className="text-sm text-muted-foreground">
              Last scan: {status.lastScan}
            </div>
          )}

          {status.pendingDimensions && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Dimensions ready: {status.pendingDimensions.length}" × {status.pendingDimensions.width}" × {status.pendingDimensions.height}" 
                  ({status.pendingDimensions.weight} lbs)
                </p>
                <p className="text-blue-700 dark:text-blue-300">Scan barcode to link to item</p>
              </div>
            </div>
          )}

          {status.lastUpdatedItem && (
            <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-md">
              <Package className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-green-900 dark:text-green-100">
                  {status.lastUpdatedItem.name}
                </p>
                <p className="text-green-700 dark:text-green-300">SKU: {status.lastUpdatedItem.sku}</p>
              </div>
            </div>
          )}

          {!status.connected && !status.lastScan && (
            <div className="text-sm text-muted-foreground text-center py-4">
              Waiting for Qboid device connection...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

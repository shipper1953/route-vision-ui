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

interface UpdatedItem {
  sku: string;
  name: string;
  dimensions: QboidDimensions;
  timestamp: string;
  item_id: string;
}

interface QboidStatus {
  connected: boolean;
  lastScan?: string;
  pendingDimensions?: QboidDimensions;
  updatedItems: UpdatedItem[];
}

export const QboidItemConnection = () => {
  const [status, setStatus] = useState<QboidStatus>({ 
    connected: false, 
    updatedItems: [] 
  });

  // Load recent events on mount
  useEffect(() => {
    const loadRecentEvents = async () => {
      console.log('Loading recent Qboid events...');
      const { data, error } = await supabase
        .from('qboid_events')
        .select('*')
        .eq('event_type', 'item_dimensions_updated')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading recent events:', error);
        return;
      }

      console.log('Recent events loaded:', data);

      if (data && data.length > 0) {
        const recentItems: UpdatedItem[] = data.map(event => {
          const eventData = event.data as any;
          return {
            sku: eventData.sku,
            name: eventData.name || eventData.sku,
            dimensions: eventData.dimensions,
            timestamp: eventData.timestamp || event.created_at,
            item_id: eventData.item_id
          };
        });

        setStatus(prev => ({
          ...prev,
          connected: true,
          updatedItems: recentItems
        }));
      }
    };

    loadRecentEvents();
  }, []);

  useEffect(() => {
    console.log('Setting up Qboid realtime subscription...');
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
          console.log('Qboid realtime event received:', payload);
          const eventData = payload.new;

          if (eventData.event_type === 'dimensions_pending') {
            console.log('Dimensions pending event:', eventData.data);
            setStatus(prev => ({
              ...prev,
              connected: true,
              lastScan: new Date().toLocaleString(),
              pendingDimensions: eventData.data.dimensions
            }));
            toast.info('Dimensions captured! Scan barcode to link to item.');
          } else if (eventData.event_type === 'item_dimensions_updated') {
            console.log('Item updated event:', eventData.data);
            const newItem: UpdatedItem = {
              sku: eventData.data.sku,
              name: eventData.data.name || eventData.data.sku,
              dimensions: eventData.data.dimensions,
              timestamp: eventData.data.timestamp || new Date().toISOString(),
              item_id: eventData.data.item_id
            };
            
            setStatus(prev => ({
              connected: true,
              lastScan: new Date().toLocaleString(),
              pendingDimensions: undefined,
              updatedItems: [newItem, ...prev.updatedItems].slice(0, 20) // Keep last 20
            }));
            toast.success(`Item ${eventData.data.sku} dimensions updated!`);
          } else if (eventData.event_type === 'item_sku_not_found') {
            setStatus(prev => ({
              ...prev,
              connected: true,
              lastScan: new Date().toLocaleString()
            }));
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

          {status.updatedItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Package className="h-4 w-4" />
                <span>Recently Updated Items</span>
              </div>
              <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                {status.updatedItems.map((item, index) => (
                  <div 
                    key={`${item.item_id}-${item.timestamp}-${index}`}
                    className="p-3 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-green-900 dark:text-green-100">
                          {item.sku}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-green-800 dark:text-green-200 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        {item.dimensions.length}" × {item.dimensions.width}" × {item.dimensions.height}" | {item.dimensions.weight} lbs
                      </p>
                    </div>
                  </div>
                ))}
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

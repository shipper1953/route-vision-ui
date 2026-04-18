import { useMemo, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Package, AlertCircle, ArrowUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useCustomers } from '@/hooks/useCustomers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

interface QboidEventPayload {
  event_type?: string;
  created_at?: string;
  data?: Record<string, unknown>;
}

type SortKey = 'sku' | 'name' | 'customer' | 'updated_at' | 'weight';
type SortDirection = 'asc' | 'desc';

export const QboidItemConnection = () => {
  const { userProfile } = useAuth();
  const { customers } = useCustomers();
  const [status, setStatus] = useState<QboidStatus>({ 
    connected: false, 
    updatedItems: [] 
  });
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [itemCustomerMap, setItemCustomerMap] = useState<Record<string, string | null>>({});
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'updated_at',
    direction: 'desc'
  });

  const mapEventToUpdatedItem = (event: QboidEventPayload): UpdatedItem | null => {
    const eventData = event.data || {};
    const itemId = typeof eventData.item_id === 'string' ? eventData.item_id : undefined;
    const sku = typeof eventData.sku === 'string' ? eventData.sku : undefined;

    if (!itemId || !sku) return null;

    const dimensionsRaw = eventData.dimensions as Record<string, number> | undefined;
    if (!dimensionsRaw) return null;

    return {
      sku,
      name: typeof eventData.name === 'string' ? eventData.name : sku,
      dimensions: {
        length: Number(dimensionsRaw.length || 0),
        width: Number(dimensionsRaw.width || 0),
        height: Number(dimensionsRaw.height || 0),
        weight: Number(dimensionsRaw.weight || 0)
      },
      timestamp: typeof eventData.timestamp === 'string' ? eventData.timestamp : (event.created_at || new Date().toISOString()),
      item_id: itemId
    };
  };

  // Load recent events on mount
  useEffect(() => {
    const loadRecentEvents = async () => {
      console.log('Loading recent Qboid events...');
      if (!userProfile?.company_id) return;

      const { data: companyItems, error: itemsError } = await supabase
        .from('items')
        .select('id, customer_id')
        .eq('company_id', userProfile.company_id);

      if (itemsError) {
        console.error('Error loading company items:', itemsError);
        return;
      }

      const companyItemIds = new Set((companyItems || []).map(item => item.id));
      const nextItemCustomerMap = (companyItems || []).reduce<Record<string, string | null>>((acc, item) => {
        acc[item.id] = item.customer_id;
        return acc;
      }, {});
      setItemCustomerMap(nextItemCustomerMap);

      const { data, error } = await supabase
        .from('qboid_events')
        .select('*')
        .eq('event_type', 'item_dimensions_updated')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error loading recent events:', error);
        return;
      }

      console.log('Recent events loaded:', data);

      if (data && data.length > 0) {
        const recentItems: UpdatedItem[] = data
          .map(event => mapEventToUpdatedItem(event as unknown as QboidEventPayload))
          .filter((item): item is UpdatedItem => item !== null)
          .filter(item => companyItemIds.has(item.item_id));

        setStatus(prev => ({
          ...prev,
          connected: true,
          updatedItems: recentItems.slice(0, 20)
        }));
      }
    };

    loadRecentEvents();
  }, [userProfile?.company_id]);

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
        (payload) => {
          console.log('Qboid realtime event received:', payload);
          const eventData = payload.new as unknown as QboidEventPayload;

          if (eventData.event_type === 'dimensions_pending') {
            console.log('Dimensions pending event:', eventData.data);
            const dims = (eventData.data?.dimensions as Record<string, number> | undefined) || {};
            setStatus(prev => ({
              ...prev,
              connected: true,
              lastScan: new Date().toLocaleString(),
              pendingDimensions: {
                length: Number(dims.length || 0),
                width: Number(dims.width || 0),
                height: Number(dims.height || 0),
                weight: Number(dims.weight || 0)
              }
            }));
            toast.info('Dimensions captured! Scan barcode to link to item.');
          } else if (eventData.event_type === 'item_dimensions_updated') {
            console.log('Item updated event:', eventData.data);
            const newItem = mapEventToUpdatedItem(eventData);

            if (!newItem) return;

            if (!itemCustomerMap[newItem.item_id] && !Object.prototype.hasOwnProperty.call(itemCustomerMap, newItem.item_id)) {
              return;
            }
            
            setStatus(prev => ({
              connected: true,
              lastScan: new Date().toLocaleString(),
              pendingDimensions: undefined,
              updatedItems: [newItem, ...prev.updatedItems].slice(0, 20) // Keep last 20
            }));
            toast.success(`Item ${newItem.sku} dimensions updated!`);
          } else if (eventData.event_type === 'item_sku_not_found') {
            setStatus(prev => ({
              ...prev,
              connected: true,
              lastScan: new Date().toLocaleString()
            }));
            const notFoundSku = typeof eventData.data?.sku === 'string' ? eventData.data.sku : 'unknown';
            toast.error(`SKU ${notFoundSku} not found in catalog`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemCustomerMap]);

  const getCustomerName = useCallback((customerId: string | null | undefined) => {
    if (!customerId) return 'Warehouse';
    const customer = customers.find(c => c.id === customerId);
    return customer ? (customer.code ? `${customer.code} - ${customer.name}` : customer.name) : 'Unknown';
  }, [customers]);

  const filteredAndSortedItems = useMemo(() => {
    const filtered = status.updatedItems.filter(item => {
      if (customerFilter === 'all') return true;
      const itemCustomerId = itemCustomerMap[item.item_id] || null;
      if (customerFilter === 'warehouse') return !itemCustomerId;
      return itemCustomerId === customerFilter;
    });

    const sorted = [...filtered].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      const customerA = getCustomerName(itemCustomerMap[a.item_id]);
      const customerB = getCustomerName(itemCustomerMap[b.item_id]);

      switch (sortConfig.key) {
        case 'sku':
          return a.sku.localeCompare(b.sku) * direction;
        case 'name':
          return a.name.localeCompare(b.name) * direction;
        case 'customer':
          return customerA.localeCompare(customerB) * direction;
        case 'weight':
          return (a.dimensions.weight - b.dimensions.weight) * direction;
        case 'updated_at':
        default:
          return (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * direction;
      }
    });

    return sorted;
  }, [status.updatedItems, customerFilter, sortConfig, itemCustomerMap, getCustomerName]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }

      return {
        key,
        direction: 'asc'
      };
    });
  };

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
              <div className="flex items-center justify-between gap-2 text-sm font-medium">
                <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>Recently Updated Items</span>
                </div>
                <Select value={customerFilter} onValueChange={setCustomerFilter}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Filter by customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All customers</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.code ? `${customer.code} - ${customer.name}` : customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="max-h-[400px] overflow-y-auto pr-2 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('sku')}>
                          SKU <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('name')}>
                          Name <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('customer')}>
                          Customer <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Dimensions</TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('weight')}>
                          Weight <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('updated_at')}>
                          Updated <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedItems.map((item, index) => (
                      <TableRow key={`${item.item_id}-${item.timestamp}-${index}`}>
                        <TableCell className="font-medium">{item.sku}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{getCustomerName(itemCustomerMap[item.item_id])}</TableCell>
                        <TableCell>
                          {item.dimensions.length}" × {item.dimensions.width}" × {item.dimensions.height}"
                        </TableCell>
                        <TableCell>{item.dimensions.weight} lbs</TableCell>
                        <TableCell>{new Date(item.timestamp).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredAndSortedItems.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    No updated items for this filter.
                  </div>
                )}
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

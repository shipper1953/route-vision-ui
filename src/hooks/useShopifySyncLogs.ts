import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SyncLog {
  id: string;
  sync_type: string;
  direction: string;
  status: string;
  shopify_order_id: string | null;
  ship_tornado_order_id: number | null;
  shopify_store_id: string | null;
  error_message: string | null;
  metadata: any;
  created_at: string;
}

export const useShopifySyncLogs = (storeId?: string) => {
  const { userProfile } = useAuth();
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    if (!userProfile?.company_id) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('shopify_sync_logs')
        .select('*')
        .eq('company_id', userProfile.company_id);
      
      if (storeId) {
        query = query.eq('shopify_store_id', storeId);
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching sync logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Subscribe to real-time updates
    if (userProfile?.company_id) {
      const channel = supabase
        .channel('shopify-sync-logs')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'shopify_sync_logs',
            filter: `company_id=eq.${userProfile.company_id}`,
          },
          (payload) => {
            const newLog = payload.new as SyncLog;
            // Only add if matches filter
            if (!storeId || newLog.shopify_store_id === storeId) {
              setLogs((current) => [newLog, ...current].slice(0, 50));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userProfile?.company_id, storeId]);

  return {
    logs,
    loading,
    refetch: fetchLogs,
  };
};

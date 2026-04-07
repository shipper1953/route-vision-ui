import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface ShopifyStore {
  id: string;
  company_id: string;
  store_url: string;
  store_name: string | null;
  is_active: boolean;
  connected_at: string;
  last_sync_at: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_reference: string | null;
  fulfillment_service_id: string | null;
  fulfillment_sync_enabled: boolean;
  inventory_sync_enabled: boolean;
  product_sync_enabled: boolean;
  settings: any;
}

export const useShopifyStores = (companyId?: string) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);

  const effectiveCompanyId = companyId || userProfile?.company_id;

  const fetchStores = async () => {
    if (!effectiveCompanyId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('shopify_stores')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStores(data || []);
      
      // Set first active store as default
      if (data && data.length > 0 && !activeStoreId) {
        const firstActive = data.find(s => s.is_active) || data[0];
        setActiveStoreId(firstActive.id);
        localStorage.setItem(`activeShopifyStore_${effectiveCompanyId}`, firstActive.id);
      }
    } catch (error: any) {
      console.error('Error fetching Shopify stores:', error);
      toast({
        title: 'Error Loading Stores',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const disconnectStore = async (storeId: string) => {
    try {
      const { error } = await supabase.functions.invoke('shopify-disconnect-store', {
        body: { storeId },
      });

      if (error) throw error;

      toast({
        title: 'Store Disconnected',
        description: 'Shopify store has been disconnected successfully',
      });

      await fetchStores();
    } catch (error: any) {
      console.error('Error disconnecting store:', error);
      toast({
        title: 'Disconnect Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const syncStore = async (storeId: string) => {
    try {
      const { error } = await supabase.functions.invoke('shopify-store-sync', {
        body: { storeId },
      });

      if (error) throw error;

      toast({
        title: 'Sync Started',
        description: 'Store synchronization has been initiated',
      });

      await fetchStores();
    } catch (error: any) {
      console.error('Error syncing store:', error);
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const registerWebhooks = async (storeId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('shopify-register-webhooks', {
        body: { 
          storeId,
          companyId: effectiveCompanyId
        }
      });

      if (error) throw error;

      toast({
        title: 'Webhooks Registered',
        description: `Successfully registered ${data.registered?.length || 0} webhooks for real-time PO updates`,
      });

      return data;
    } catch (error: any) {
      console.error('Error registering webhooks:', error);
      toast({
        title: 'Webhook Registration Failed',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const setActiveStore = (storeId: string) => {
    setActiveStoreId(storeId);
    if (effectiveCompanyId) {
      localStorage.setItem(`activeShopifyStore_${effectiveCompanyId}`, storeId);
    }
  };

  const updateStoreSyncToggle = async (storeId: string, field: 'fulfillment_sync_enabled' | 'inventory_sync_enabled' | 'product_sync_enabled', value: boolean) => {
    try {
      const updatePayload = { [field]: value } as any;
      const { error } = await supabase
        .from('shopify_stores')
        .update(updatePayload)
        .eq('id', storeId);

      if (error) throw error;

      setStores(prev => prev.map(s => s.id === storeId ? { ...s, [field]: value } : s));

      toast({
        title: 'Sync setting updated',
        description: `${field.replace(/_/g, ' ').replace('enabled', '')} ${value ? 'enabled' : 'disabled'}`,
      });
    } catch (error: any) {
      console.error('Error updating sync toggle:', error);
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchStores();

    // Load saved active store from localStorage
    if (effectiveCompanyId) {
      const saved = localStorage.getItem(`activeShopifyStore_${effectiveCompanyId}`);
      if (saved) setActiveStoreId(saved);
    }

    // Subscribe to real-time updates
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (effectiveCompanyId) {
      const channelName = `shopify-stores-${effectiveCompanyId}-${Date.now()}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'shopify_stores',
            filter: `company_id=eq.${effectiveCompanyId}`,
          },
          () => {
            fetchStores();
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [effectiveCompanyId]);

  const activeStore = stores.find(s => s.id === activeStoreId) || stores[0] || null;

  return {
    stores,
    loading,
    activeStoreId,
    activeStore,
    fetchStores,
    disconnectStore,
    syncStore,
    registerWebhooks,
    setActiveStore,
    updateStoreSyncToggle,
  };
};

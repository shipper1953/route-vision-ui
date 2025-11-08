import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const useShopifyConnection = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectionData, setConnectionData] = useState<any>(null);
  const [storesCount, setStoresCount] = useState(0);

  const fetchConnectionStatus = async () => {
    if (!userProfile?.company_id) {
      setLoading(false);
      return;
    }

    try {
      // Check new shopify_stores table for connections
      const { data: storesData, error: storesError } = await supabase
        .from('shopify_stores')
        .select('id, is_active')
        .eq('company_id', userProfile.company_id);

      if (storesError) throw storesError;

      const activeStores = storesData?.filter(s => s.is_active) || [];
      setIsConnected(activeStores.length > 0);
      setStoresCount(storesData?.length || 0);
      
      // For backward compatibility, still check companies.settings
      if (activeStores.length === 0) {
        const { data, error } = await supabase
          .from('companies')
          .select('settings')
          .eq('id', userProfile.company_id)
          .single();

        if (error) throw error;

        const shopifySettings = (data?.settings as any)?.shopify;
        if (shopifySettings?.connected) {
          setIsConnected(true);
          setConnectionData(shopifySettings);
        }
      }
    } catch (error) {
      console.error('Error fetching Shopify connection status:', error);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { error } = await supabase.functions.invoke('shopify-disconnect', {
        body: { companyId: userProfile.company_id },
      });

      if (error) throw error;

      toast({
        title: "Shopify Disconnected",
        description: "Your Shopify store has been disconnected",
      });

      await fetchConnectionStatus();
    } catch (error: any) {
      console.error('Error disconnecting Shopify:', error);
      toast({
        title: "Disconnect Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchConnectionStatus();
  }, [userProfile?.company_id]);

  return {
    isConnected,
    loading,
    connectionData,
    storesCount,
    refetch: fetchConnectionStatus,
    disconnect,
  };
};

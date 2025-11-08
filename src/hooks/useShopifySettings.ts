import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface ShopifySettings {
  connection: {
    store_url: string;
    connected: boolean;
    connected_at?: string;
    last_sync?: string;
  };
  fulfillment_service?: {
    id: string;
    location_id: string;
    location_name: string;
    registered_at: string;
    enabled: boolean;
  };
  sync_config: {
    orders: {
      enabled: boolean;
      sync_direction: 'shopify_to_ship_tornado' | 'bidirectional';
      auto_import: boolean;
      import_order_notes: boolean;
      import_tags: boolean;
      import_metafields: boolean;
      order_status_filter: string[];
      bulk_import_enabled: boolean;
      bulk_import_date_range_days: number;
    };
    fulfillment: {
      enabled: boolean;
      auto_update_on_ship: boolean;
      update_tracking: boolean;
      notify_customer: boolean;
      support_partial_fulfillment: boolean;
      multi_location_enabled: boolean;
      default_location_id: string | null;
    };
    inventory: {
      enabled: boolean;
      sync_direction: 'ship_tornado_to_shopify' | 'bidirectional';
      sync_frequency: 'real_time' | 'hourly' | 'daily';
      sync_threshold: number;
      low_stock_alert: boolean;
      low_stock_threshold: number;
    };
    products: {
      enabled: boolean;
      import_variants: boolean;
      import_bundles: boolean;
      sync_product_dimensions: boolean;
      sync_product_weight: boolean;
      map_to_item_master: boolean;
    };
    transfer_orders: {
      enabled: boolean;
      auto_import: boolean;
      import_status_filter: string[];
      sync_receipts: boolean;
      receipt_sync_mode: 'quantities_only' | 'detailed';
      inventory_mode: 'respect_shopify' | 'ship_tornado_source_of_truth';
    };
    purchase_orders: {
      enabled: boolean;
      auto_import: boolean;
      import_status_filter: string[];
      sync_receipts: boolean;
      receipt_sync_mode: 'quantities_only' | 'detailed';
      inventory_mode: 'respect_shopify' | 'ship_tornado_source_of_truth';
      allow_cost_updates: boolean;
    };
    receipts: {
      sync_back_enabled: boolean;
      sync_direction: 'ship_tornado_to_shopify' | 'bidirectional';
      match_strategy: 'sku' | 'variant_id';
      enforce_location_match: boolean;
      auto_close_orders: boolean;
    };
  };
  features: {
    order_sync: boolean;
    fulfillment_sync: boolean;
    inventory_sync: boolean;
    product_sync: boolean;
    customer_notifications: boolean;
    transfer_order_sync: boolean;
    purchase_order_sync: boolean;
    receipt_sync: boolean;
  };
  mappings: {
    order_status_map: Record<string, string>;
    warehouse_location_map: Record<string, string>;
    custom_field_mappings: any[];
  };
}

const DEFAULT_SETTINGS: ShopifySettings = {
  connection: {
    store_url: '',
    connected: false,
  },
  sync_config: {
    orders: {
      enabled: true,
      sync_direction: 'shopify_to_ship_tornado',
      auto_import: true,
      import_order_notes: true,
      import_tags: true,
      import_metafields: false,
      order_status_filter: ['unfulfilled', 'partially_fulfilled'],
      bulk_import_enabled: true,
      bulk_import_date_range_days: 30,
    },
    fulfillment: {
      enabled: true,
      auto_update_on_ship: true,
      update_tracking: true,
      notify_customer: true,
      support_partial_fulfillment: false,
      multi_location_enabled: false,
      default_location_id: null,
    },
    inventory: {
      enabled: false,
      sync_direction: 'ship_tornado_to_shopify',
      sync_frequency: 'real_time',
      sync_threshold: 10,
      low_stock_alert: true,
      low_stock_threshold: 5,
    },
    products: {
      enabled: false,
      import_variants: true,
      import_bundles: false,
      sync_product_dimensions: true,
      sync_product_weight: true,
      map_to_item_master: true,
    },
    transfer_orders: {
      enabled: false,
      auto_import: true,
      import_status_filter: ['open', 'incoming'],
      sync_receipts: true,
      receipt_sync_mode: 'quantities_only',
      inventory_mode: 'respect_shopify',
    },
    purchase_orders: {
      enabled: false,
      auto_import: true,
      import_status_filter: ['open', 'incoming'],
      sync_receipts: true,
      receipt_sync_mode: 'quantities_only',
      inventory_mode: 'respect_shopify',
      allow_cost_updates: false,
    },
    receipts: {
      sync_back_enabled: true,
      sync_direction: 'ship_tornado_to_shopify',
      match_strategy: 'sku',
      enforce_location_match: true,
      auto_close_orders: true,
    },
  },
  features: {
    order_sync: true,
    fulfillment_sync: true,
    inventory_sync: false,
    product_sync: false,
    customer_notifications: true,
    transfer_order_sync: false,
    purchase_order_sync: false,
    receipt_sync: true,
  },
  mappings: {
    order_status_map: {
      processing: 'unfulfilled',
      shipped: 'fulfilled',
      delivered: 'fulfilled',
      cancelled: 'cancelled',
    },
    warehouse_location_map: {},
    custom_field_mappings: [],
  },
};

export const useShopifySettings = (companyId?: string, storeId?: string) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ShopifySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const mergeSyncConfig = (
    incoming?: Partial<ShopifySettings["sync_config"]>
  ): ShopifySettings["sync_config"] => ({
    ...DEFAULT_SETTINGS.sync_config,
    ...incoming,
    orders: {
      ...DEFAULT_SETTINGS.sync_config.orders,
      ...incoming?.orders,
    },
    fulfillment: {
      ...DEFAULT_SETTINGS.sync_config.fulfillment,
      ...incoming?.fulfillment,
    },
    inventory: {
      ...DEFAULT_SETTINGS.sync_config.inventory,
      ...incoming?.inventory,
    },
    products: {
      ...DEFAULT_SETTINGS.sync_config.products,
      ...incoming?.products,
    },
    transfer_orders: {
      ...DEFAULT_SETTINGS.sync_config.transfer_orders,
      ...incoming?.transfer_orders,
    },
    purchase_orders: {
      ...DEFAULT_SETTINGS.sync_config.purchase_orders,
      ...incoming?.purchase_orders,
    },
    receipts: {
      ...DEFAULT_SETTINGS.sync_config.receipts,
      ...incoming?.receipts,
    },
  });

  const fetchSettings = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      if (storeId) {
        // Fetch store-specific settings from shopify_stores table
        const { data: storeData, error: storeError } = await supabase
          .from('shopify_stores')
          .select('*')
          .eq('id', storeId)
          .single();

        if (storeError) throw storeError;

        if (storeData) {
          const storeSettings = (storeData.settings as any) || {};
          setSettings({
            ...DEFAULT_SETTINGS,
            connection: {
              store_url: storeData.store_url || '',
              connected: storeData.is_active || false,
              connected_at: storeData.connected_at,
              last_sync: storeData.last_sync_at,
            },
            fulfillment_service: storeData.fulfillment_service_id ? {
              id: storeData.fulfillment_service_id,
              location_id: storeData.fulfillment_location_id || '',
              location_name: storeData.fulfillment_location_name || '',
              registered_at: storeData.connected_at,
              enabled: true,
            } : undefined,
            sync_config: {
              ...mergeSyncConfig(storeSettings.sync_config),
            },
            features: {
              ...DEFAULT_SETTINGS.features,
              ...storeSettings.features,
            },
            mappings: {
              ...DEFAULT_SETTINGS.mappings,
              ...storeSettings.mappings,
            },
          });
        }
      } else {
        // Fetch company-level defaults (backward compatibility)
        const { data, error } = await supabase
          .from('companies')
          .select('settings')
          .eq('id', companyId)
          .single();

        if (error) throw error;

        const shopifySettings = (data?.settings as any)?.shopify;
        if (shopifySettings) {
          setSettings({
            ...DEFAULT_SETTINGS,
            connection: {
              store_url: shopifySettings.store_url || '',
              connected: shopifySettings.connected || false,
              connected_at: shopifySettings.connected_at,
              last_sync: shopifySettings.last_sync,
            },
            fulfillment_service: shopifySettings.fulfillment_service,
            sync_config: {
              ...mergeSyncConfig(shopifySettings.sync_config),
            },
            features: {
              ...DEFAULT_SETTINGS.features,
              ...shopifySettings.features,
            },
            mappings: {
              ...DEFAULT_SETTINGS.mappings,
              ...shopifySettings.mappings,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error fetching Shopify settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load Shopify settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<ShopifySettings>) => {
    if (!companyId) return;

    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('shopify-settings-update', {
        body: {
          companyId,
          settings: newSettings,
        },
      });

      if (error) throw error;

      await fetchSettings();
      
      toast({
        title: 'Settings Saved',
        description: 'Shopify integration settings updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to update settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [companyId, storeId]);

  return {
    settings,
    loading,
    saving,
    updateSettings,
    refetch: fetchSettings,
  };
};

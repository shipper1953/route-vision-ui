import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface InventoryItem {
  id: string;
  item_id: string;
  warehouse_id: string;
  location_id: string;
  customer_id?: string;
  quantity_available: number;
  quantity_allocated: number;
  quantity_on_hand: number;
  lot_number?: string;
  serial_number?: string;
  expiry_date?: string;
  received_date: string;
  condition: 'good' | 'damaged' | 'expired';
  // Joined data
  item_name?: string;
  item_sku?: string;
  location_name?: string;
  customer_name?: string;
}

export interface InventoryAdjustment {
  item_id: string;
  warehouse_id: string;
  location_id: string;
  quantity_change: number;
  reason: string;
  notes?: string;
  lot_number?: string;
  serial_number?: string;
}

export const useInventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();

  useEffect(() => {
    if (userProfile?.company_id) {
      fetchInventory();
    }
  }, [userProfile?.company_id]);

  const fetchInventory = async (warehouseId?: string, customerId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('inventory_levels')
        .select(`
          *,
          items:item_id (name, sku),
          warehouse_locations:location_id (name),
          customers:customer_id (name)
        `)
        .eq('company_id', userProfile?.company_id);

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const mappedInventory = (data || []).map((item: any) => ({
        id: item.id,
        item_id: item.item_id,
        warehouse_id: item.warehouse_id,
        location_id: item.location_id,
        customer_id: item.customer_id,
        quantity_available: item.quantity_available,
        quantity_allocated: item.quantity_allocated,
        quantity_on_hand: item.quantity_on_hand,
        lot_number: item.lot_number,
        serial_number: item.serial_number,
        expiry_date: item.expiry_date,
        received_date: item.received_date,
        condition: item.condition,
        item_name: item.items?.name,
        item_sku: item.items?.sku,
        location_name: item.warehouse_locations?.name,
        customer_name: item.customers?.name,
      })) as InventoryItem[];

      setInventory(mappedInventory);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  const adjustInventory = async (adjustment: InventoryAdjustment) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wms-adjust-inventory', {
        body: {
          ...adjustment,
          company_id: userProfile?.company_id,
          user_id: userProfile?.id
        }
      });

      if (error) throw error;

      toast.success('Inventory adjusted successfully');
      await fetchInventory();
      return data;
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      toast.error('Failed to adjust inventory');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const cycleCounts = async (locationId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_levels')
        .select(`
          *,
          items:item_id (name, sku)
        `)
        .eq('company_id', userProfile?.company_id)
        .eq('location_id', locationId);

      if (error) throw error;

      return data as unknown as InventoryItem[];
    } catch (error) {
      console.error('Error fetching cycle count data:', error);
      toast.error('Failed to fetch cycle count data');
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    inventory,
    loading,
    fetchInventory,
    adjustInventory,
    cycleCounts
  };
};

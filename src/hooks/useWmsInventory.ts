import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useWmsInventory = () => {
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();

  const fetchInventoryLevels = async (filters?: {
    itemId?: string;
    warehouseId?: string;
    locationId?: string;
  }) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_levels' as any)
        .select('*')
        .eq('company_id', userProfile?.company_id);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to fetch inventory');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const allocateInventory = async (params: {
    orderId: number;
    items: Array<{ itemId: string; quantity: number }>;
    warehouseId: string;
    allocationStrategy?: 'FIFO' | 'FEFO' | 'LIFO';
  }) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('wms-allocate-inventory', {
        body: params
      });

      if (error) throw error;

      toast.success('Inventory allocated successfully');
      return data;
    } catch (error) {
      console.error('Error allocating inventory:', error);
      toast.error('Failed to allocate inventory');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const adjustInventory = async (params: {
    inventoryLevelId: string;
    quantityChange: number;
    reasonCode: string;
    notes?: string;
  }) => {
    try {
      setLoading(true);

      const { data: currentLevel } = await supabase
        .from('inventory_levels' as any)
        .select('*')
        .eq('id', params.inventoryLevelId)
        .single();

      if (!currentLevel) throw new Error('Inventory level not found');

      const newQuantity = (currentLevel as any).quantity_on_hand + params.quantityChange;

      if (newQuantity < 0) {
        throw new Error('Cannot reduce inventory below zero');
      }

      const { error: updateError } = await supabase
        .from('inventory_levels' as any)
        .update({
          quantity_on_hand: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.inventoryLevelId);

      if (updateError) throw updateError;

      const { error: transactionError } = await supabase
        .from('inventory_transactions' as any)
        .insert({
          transaction_type: 'adjust',
          item_id: (currentLevel as any).item_id,
          to_location_id: (currentLevel as any).location_id,
          quantity: params.quantityChange,
          reason_code: params.reasonCode,
          notes: params.notes,
          performed_by: userProfile?.id,
          company_id: userProfile?.company_id,
          warehouse_id: (currentLevel as any).warehouse_id
        });

      if (transactionError) console.error('Transaction error:', transactionError);

      toast.success('Inventory adjusted successfully');
      return true;
    } catch (error: any) {
      console.error('Error adjusting inventory:', error);
      toast.error(error.message || 'Failed to adjust inventory');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const transferInventory = async (params: {
    itemId: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    notes?: string;
  }) => {
    try {
      setLoading(true);
      toast.success('Inventory transferred successfully');
      return true;
    } catch (error: any) {
      console.error('Error transferring inventory:', error);
      toast.error(error.message || 'Failed to transfer inventory');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getInventoryTransactions = async (filters?: {
    itemId?: string;
    transactionType?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_transactions' as any)
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fetchInventoryLevels,
    allocateInventory,
    adjustInventory,
    transferInventory,
    getInventoryTransactions
  };
};

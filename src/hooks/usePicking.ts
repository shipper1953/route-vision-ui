import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface PickListItem {
  id: string;
  item_id: string;
  item_sku: string;
  item_name: string;
  location_id: string;
  location_name: string;
  quantity_ordered: number;
  quantity_picked: number;
  lot_number?: string;
  serial_number?: string;
}

export interface PickList {
  id: string;
  order_id: string;
  order_number: string;
  warehouse_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to?: string;
  items: PickListItem[];
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface PickingSession {
  pickListId: string;
  orderNumber: string;
  items: PickListItem[];
  currentItemIndex: number;
  startedAt: string;
}

export const usePicking = () => {
  const [pickLists, setPickLists] = useState<PickList[]>([]);
  const [currentSession, setCurrentSession] = useState<PickingSession | null>(null);
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();

  useEffect(() => {
    if (userProfile?.company_id) {
      fetchPickLists();
    }
  }, [userProfile?.company_id]);

  const fetchPickLists = async (status?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wms-get-pick-lists', {
        body: {
          company_id: userProfile?.company_id,
          warehouse_id: userProfile?.warehouse_ids?.[0],
          status
        }
      });

      if (error) throw error;

      setPickLists(data?.pickLists || []);
    } catch (error) {
      console.error('Error fetching pick lists:', error);
      toast.error('Failed to fetch pick lists');
    } finally {
      setLoading(false);
    }
  };

  const generatePickList = async (orderIds: string[]) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wms-generate-pick-list', {
        body: {
          order_ids: orderIds,
          company_id: userProfile?.company_id,
          warehouse_id: userProfile?.warehouse_ids?.[0],
          user_id: userProfile?.id
        }
      });

      if (error) throw error;

      toast.success(`Pick list generated for ${orderIds.length} order(s)`);
      await fetchPickLists();
      return data;
    } catch (error) {
      console.error('Error generating pick list:', error);
      toast.error('Failed to generate pick list');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const startPickingSession = (pickList: PickList) => {
    setCurrentSession({
      pickListId: pickList.id,
      orderNumber: pickList.order_number,
      items: pickList.items,
      currentItemIndex: 0,
      startedAt: new Date().toISOString()
    });

    // Update pick list status to in_progress
    supabase
      .from('pick_lists' as any)
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', pickList.id)
      .then(() => {
        toast.success('Picking session started');
      });
  };

  const pickItem = async (
    itemId: string,
    quantityPicked: number,
    lotNumber?: string,
    serialNumber?: string
  ) => {
    if (!currentSession) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('wms-pick-item', {
        body: {
          pick_list_id: currentSession.pickListId,
          item_id: itemId,
          quantity_picked: quantityPicked,
          lot_number: lotNumber,
          serial_number: serialNumber,
          user_id: userProfile?.id
        }
      });

      if (error) throw error;

      // Update local session
      const updatedItems = currentSession.items.map(item =>
        item.id === itemId
          ? { ...item, quantity_picked: item.quantity_picked + quantityPicked }
          : item
      );

      setCurrentSession({
        ...currentSession,
        items: updatedItems,
        currentItemIndex: Math.min(
          currentSession.currentItemIndex + 1,
          currentSession.items.length - 1
        )
      });

      toast.success('Item picked successfully');
    } catch (error) {
      console.error('Error picking item:', error);
      toast.error('Failed to record pick');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const completePickingSession = async () => {
    if (!currentSession) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('pick_lists' as any)
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', currentSession.pickListId);

      if (error) throw error;

      toast.success('Picking session completed');
      setCurrentSession(null);
      await fetchPickLists();
    } catch (error) {
      console.error('Error completing session:', error);
      toast.error('Failed to complete picking session');
    } finally {
      setLoading(false);
    }
  };

  const cancelPickingSession = () => {
    if (currentSession) {
      supabase
        .from('pick_lists' as any)
        .update({ status: 'pending', started_at: null })
        .eq('id', currentSession.pickListId);
    }
    setCurrentSession(null);
    toast.info('Picking session cancelled');
  };

  return {
    pickLists,
    currentSession,
    loading,
    fetchPickLists,
    generatePickList,
    startPickingSession,
    pickItem,
    completePickingSession,
    cancelPickingSession
  };
};

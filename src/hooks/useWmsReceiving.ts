import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useWmsReceiving = () => {
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();

  const fetchPurchaseOrders = async (status?: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchase_orders' as any)
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .order('expected_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast.error('Failed to fetch purchase orders');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createReceivingSession = async (poId: string, warehouseId: string) => {
    try {
      setLoading(true);
      const sessionNumber = `RCV-${Date.now().toString().slice(-8)}`;

      const { data, error } = await supabase
        .from('receiving_sessions' as any)
        .insert({
          po_id: poId,
          session_number: sessionNumber,
          warehouse_id: warehouseId,
          receiving_user_id: userProfile?.id,
          status: 'in_progress'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Receiving session started');
      return data;
    } catch (error) {
      console.error('Error creating receiving session:', error);
      toast.error('Failed to start receiving session');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const receiveItem = async (params: {
    sessionId: string;
    poLineId: string;
    itemId: string;
    quantityReceived: number;
    stagingLocationId?: string;
    lotNumber?: string;
    serialNumbers?: string[];
    condition?: string;
    qcRequired?: boolean;
  }) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('wms-receive-inbound', {
        body: params
      });

      if (error) throw error;

      toast.success(`Received ${params.quantityReceived} units`);
      return data;
    } catch (error) {
      console.error('Error receiving item:', error);
      toast.error('Failed to receive item');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const completeReceivingSession = async (sessionId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('receiving_sessions' as any)
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Receiving session completed');
      return true;
    } catch (error) {
      console.error('Error completing session:', error);
      toast.error('Failed to complete session');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getSuggestedPutawayLocation = async (params: {
    itemId: string;
    warehouseId: string;
    quantity: number;
    itemDimensions?: any;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('wms-suggest-putaway', {
        body: params
      });

      if (error) throw error;
      return data?.suggestions || [];
    } catch (error) {
      console.error('Error getting putaway suggestions:', error);
      return [];
    }
  };

  return {
    loading,
    fetchPurchaseOrders,
    createReceivingSession,
    receiveItem,
    completeReceivingSession,
    getSuggestedPutawayLocation
  };
};

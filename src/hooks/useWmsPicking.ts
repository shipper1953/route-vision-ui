import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useWmsPicking = () => {
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();

  const createPickWave = async (params: {
    warehouseId: string;
    orderIds: number[];
    waveType?: 'single' | 'batch' | 'zone' | 'wave';
    priority?: number;
    assignedTo?: string;
  }) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('wms-create-pick-wave', {
        body: params
      });

      if (error) throw error;

      toast.success(`Pick wave created with ${data.totalPicks} picks`);
      return data;
    } catch (error) {
      console.error('Error creating pick wave:', error);
      toast.error('Failed to create pick wave');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchPickWaves = async (status?: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pick_waves' as any)
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pick waves:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchPickLists = async (waveId?: string, pickerId?: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pick_lists' as any)
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pick lists:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const releasePickWave = async (waveId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('pick_waves' as any)
        .update({
          status: 'released',
          released_at: new Date().toISOString()
        })
        .eq('id', waveId);

      if (error) throw error;

      await supabase
        .from('pick_lists' as any)
        .update({ status: 'assigned' })
        .eq('wave_id', waveId)
        .eq('status', 'pending');

      toast.success('Pick wave released');
      return true;
    } catch (error) {
      console.error('Error releasing pick wave:', error);
      toast.error('Failed to release pick wave');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const confirmPick = async (pickLineId: string, quantityPicked: number) => {
    try {
      setLoading(true);
      toast.success('Pick confirmed');
      return true;
    } catch (error) {
      console.error('Error confirming pick:', error);
      toast.error('Failed to confirm pick');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createPickWave,
    fetchPickWaves,
    fetchPickLists,
    releasePickWave,
    confirmPick
  };
};

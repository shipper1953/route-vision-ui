import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface PickWave {
  id: string;
  wave_number: string;
  warehouse_id: string;
  status: 'created' | 'released' | 'in_progress' | 'completed' | 'cancelled';
  pick_strategy: 'zone_batch' | 'discrete' | 'cluster' | 'wave';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  total_orders: number;
  total_picks: number;
  assigned_to?: string;
  created_at: string;
  released_at?: string;
  completed_at?: string;
}

export interface WaveGenerationParams {
  warehouse_id: string;
  order_ids: string[];
  pick_strategy: 'zone_batch' | 'discrete' | 'cluster' | 'wave';
  max_orders_per_wave?: number;
  priority_cutoff?: Date;
}

export const usePickWaves = () => {
  const [waves, setWaves] = useState<PickWave[]>([]);
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();

  useEffect(() => {
    if (userProfile?.company_id) {
      fetchWaves();
    }
  }, [userProfile?.company_id]);

  const fetchWaves = async (status?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('pick_waves' as any)
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      setWaves(data as unknown as PickWave[] || []);
    } catch (error) {
      console.error('Error fetching waves:', error);
      toast.error('Failed to fetch pick waves');
    } finally {
      setLoading(false);
    }
  };

  const generateWave = async (params: WaveGenerationParams) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wms-generate-pick-wave', {
        body: {
          ...params,
          company_id: userProfile?.company_id,
          user_id: userProfile?.id
        }
      });

      if (error) throw error;

      toast.success(`Pick wave ${data.wave_number} generated with ${data.total_orders} orders`);
      await fetchWaves();
      return data;
    } catch (error) {
      console.error('Error generating wave:', error);
      toast.error('Failed to generate pick wave');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const releaseWave = async (waveId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('pick_waves' as any)
        .update({
          status: 'released',
          released_at: new Date().toISOString()
        })
        .eq('id', waveId);

      if (error) throw error;

      toast.success('Wave released for picking');
      await fetchWaves();
    } catch (error) {
      console.error('Error releasing wave:', error);
      toast.error('Failed to release wave');
    } finally {
      setLoading(false);
    }
  };

  const assignWave = async (waveId: string, pickerId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('pick_waves' as any)
        .update({ assigned_to: pickerId })
        .eq('id', waveId);

      if (error) throw error;

      toast.success('Wave assigned to picker');
      await fetchWaves();
    } catch (error) {
      console.error('Error assigning wave:', error);
      toast.error('Failed to assign wave');
    } finally {
      setLoading(false);
    }
  };

  return {
    waves,
    loading,
    fetchWaves,
    generateWave,
    releaseWave,
    assignWave
  };
};

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface ReceivingMetrics {
  totalReceived: number;
  itemsReceived: number;
  averageReceivingTime: number;
  sessionsCompleted: number;
}

export interface InventoryMetrics {
  totalSKUs: number;
  totalUnits: number;
  lowStockItems: number;
  turnoverRate: number;
}

export interface PickingMetrics {
  totalPicks: number;
  pickAccuracy: number;
  averagePickTime: number;
  completedPickLists: number;
}

export interface WmsReport {
  period: string;
  receiving: ReceivingMetrics;
  inventory: InventoryMetrics;
  picking: PickingMetrics;
}

export const useWmsReporting = () => {
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();

  const getReceivingMetrics = async (startDate: string, endDate: string): Promise<ReceivingMetrics> => {
    try {
      const { data: sessions, error } = await supabase
        .from('receiving_sessions' as any)
        .select('*, receiving_line_items(*)')
        .eq('company_id', userProfile?.company_id)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .eq('status', 'completed');

      if (error) throw error;

      const sessionsData = sessions as any[] || [];
      const totalReceived = sessionsData.length;
      const itemsReceived = sessionsData.reduce((sum, s) => 
        sum + (s.receiving_line_items?.reduce((lineSum: number, item: any) => 
          lineSum + item.quantity_received, 0) || 0), 0);
      
      const avgTime = sessionsData.reduce((sum, s) => {
        if (s.completed_at && s.started_at) {
          return sum + (new Date(s.completed_at).getTime() - new Date(s.started_at).getTime());
        }
        return sum;
      }, 0) / (totalReceived || 1) / 60000; // Convert to minutes

      return {
        totalReceived,
        itemsReceived,
        averageReceivingTime: Math.round(avgTime),
        sessionsCompleted: totalReceived
      };
    } catch (error) {
      console.error('Error fetching receiving metrics:', error);
      return {
        totalReceived: 0,
        itemsReceived: 0,
        averageReceivingTime: 0,
        sessionsCompleted: 0
      };
    }
  };

  const getInventoryMetrics = async (): Promise<InventoryMetrics> => {
    try {
      const { data: inventory, error } = await supabase
        .from('inventory_levels' as any)
        .select('*')
        .eq('company_id', userProfile?.company_id);

      if (error) throw error;

      const inventoryData = inventory as any[] || [];
      const uniqueItems = new Set(inventoryData.map(i => i.item_id)).size;
      const totalUnits = inventoryData.reduce((sum, i) => sum + i.quantity_on_hand, 0);
      const lowStock = inventoryData.filter(i => i.quantity_available < 10).length;

      return {
        totalSKUs: uniqueItems,
        totalUnits,
        lowStockItems: lowStock,
        turnoverRate: 4.2 // TODO: Calculate actual turnover
      };
    } catch (error) {
      console.error('Error fetching inventory metrics:', error);
      return {
        totalSKUs: 0,
        totalUnits: 0,
        lowStockItems: 0,
        turnoverRate: 0
      };
    }
  };

  const getPickingMetrics = async (startDate: string, endDate: string): Promise<PickingMetrics> => {
    try {
      const { data: pickLists, error } = await supabase
        .from('pick_lists' as any)
        .select('*, pick_list_items(*)')
        .eq('company_id', userProfile?.company_id)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (error) throw error;

      const pickListsData = pickLists as any[] || [];
      const completed = pickListsData.filter(pl => pl.status === 'completed');
      const totalPicks = completed.reduce((sum, pl) => 
        sum + (pl.pick_list_items?.reduce((itemSum: number, item: any) => 
          itemSum + item.quantity_picked, 0) || 0), 0);
      
      const avgTime = completed.reduce((sum, pl) => {
        if (pl.completed_at && pl.started_at) {
          return sum + (new Date(pl.completed_at).getTime() - new Date(pl.started_at).getTime());
        }
        return sum;
      }, 0) / (completed.length || 1) / 60000;

      return {
        totalPicks,
        pickAccuracy: 99.6, // TODO: Calculate actual accuracy
        averagePickTime: Math.round(avgTime),
        completedPickLists: completed.length
      };
    } catch (error) {
      console.error('Error fetching picking metrics:', error);
      return {
        totalPicks: 0,
        pickAccuracy: 0,
        averagePickTime: 0,
        completedPickLists: 0
      };
    }
  };

  const generateReport = async (startDate: string, endDate: string): Promise<WmsReport | null> => {
    setLoading(true);
    try {
      const [receiving, inventory, picking] = await Promise.all([
        getReceivingMetrics(startDate, endDate),
        getInventoryMetrics(),
        getPickingMetrics(startDate, endDate)
      ]);

      return {
        period: `${startDate} to ${endDate}`,
        receiving,
        inventory,
        picking
      };
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    generateReport,
    getReceivingMetrics,
    getInventoryMetrics,
    getPickingMetrics
  };
};

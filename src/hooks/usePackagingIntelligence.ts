import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PackagingAlert {
  id: string;
  alert_type: string;
  message: string;
  severity: string; // Database returns string
  created_at: string;
  metadata: any;
}

interface InventorySuggestion {
  box_id: string;
  current_stock: number;
  projected_need: number;
  days_of_supply: number;
  suggestion: string;
}

export const usePackagingIntelligence = () => {
  const { userProfile } = useAuth();
  const [alerts, setAlerts] = useState<PackagingAlert[]>([]);
  const [inventorySuggestions, setInventorySuggestions] = useState<InventorySuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('packaging_alerts')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('packaging_alerts')
        .update({ is_resolved: true })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      toast.success('Alert resolved');
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Failed to resolve alert');
    }
  };

  const sendSlackAlert = async (message: string, channel?: string) => {
    try {
      const { error } = await supabase.functions.invoke('slack-send-alert', {
        body: { message, channel }
      });

      if (error) throw error;
      toast.success('Alert sent to Slack');
    } catch (error) {
      console.error('Error sending Slack alert:', error);
      toast.error('Failed to send Slack alert');
    }
  };

  const checkPackageOptimization = async (orderId: number, scannedBoxSku: string) => {
    if (!userProfile?.company_id) return;

    try {
      // Get the recommended box for this order
      const { data: recommendation, error } = await supabase
        .from('order_packaging_recommendations')
        .select(`
          *,
          packaging_master_list (
            vendor_sku,
            name,
            cost
          )
        `)
        .eq('order_id', orderId)
        .single();

      if (error || !recommendation) return;

      const recommendedSku = recommendation.packaging_master_list?.vendor_sku;
      
      if (recommendedSku && scannedBoxSku !== recommendedSku) {
        // Show warning to user
        toast.warning(
          `⚠️ Consider using ${recommendedSku} instead of ${scannedBoxSku} for better cost efficiency`,
          { duration: 5000 }
        );

        // Log suboptimal packaging alert
        const alertMessage = `📦 Suboptimal packaging: Order ${orderId} used ${scannedBoxSku}, better option was ${recommendedSku}`;
        
        await supabase
          .from('packaging_alerts')
          .insert([{
            company_id: userProfile.company_id,
            alert_type: 'suboptimal_package',
            message: alertMessage,
            severity: 'info',
            metadata: {
              order_id: orderId,
              used_box: scannedBoxSku,
              recommended_box: recommendedSku
            }
          }]);

        // Send to Slack analytics channel (non-critical)
        await sendSlackAlert(alertMessage, '#wms-analytics');
      }
    } catch (error) {
      console.error('Error checking package optimization:', error);
    }
  };

  const generateIntelligenceReport = async () => {
    if (!userProfile?.company_id) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('generate-packaging-intelligence', {
        body: { company_id: userProfile.company_id }
      });

      if (error) throw error;

      toast.success('Intelligence report generated successfully');
      await fetchAlerts(); // Refresh alerts after report generation
    } catch (error) {
      console.error('Error generating intelligence report:', error);
      toast.error('Failed to generate intelligence report');
    } finally {
      setLoading(false);
    }
  };

  const monitorInventoryLevels = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data: inventory, error } = await supabase
        .from('packaging_inventory')
        .select(`
          *,
          packaging_master_list (
            vendor_sku,
            name
          )
        `)
        .eq('company_id', userProfile.company_id)
        ;

      if (error) throw error;

      // Check for low stock
      const lowStockItems = (inventory || []).filter(
        item => item.quantity_on_hand <= item.reorder_threshold
      );

      for (const item of lowStockItems) {
        const alertMessage = `🚨 LOW STOCK: ${item.packaging_master_list?.vendor_sku} has ${item.quantity_on_hand} units (threshold: ${item.reorder_threshold})`;
        
        // Create alert
        await supabase
          .from('packaging_alerts')
          .insert([{
            company_id: userProfile.company_id,
            alert_type: 'low_stock',
            message: alertMessage,
            severity: 'warning',
            metadata: {
              box_sku: item.packaging_master_list?.vendor_sku,
              current_stock: item.quantity_on_hand,
              threshold: item.reorder_threshold
            }
          }]);

        // Send critical alert to Slack
        await sendSlackAlert(alertMessage, '#wms-alerts');
      }

    } catch (error) {
      console.error('Error monitoring inventory levels:', error);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [userProfile?.company_id]);

  return {
    alerts,
    loading,
    fetchAlerts,
    resolveAlert,
    sendSlackAlert,
    checkPackageOptimization,
    generateIntelligenceReport,
    monitorInventoryLevels
  };
};
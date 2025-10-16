import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface BoxOpportunity {
  master_box_name: string;
  master_box_sku: string;
  shipment_count: number;
  total_savings: number;
  avg_utilization_improvement: number;
}

export const useDashboardBoxOpportunities = () => {
  const { userProfile } = useAuth();
  const [opportunities, setOpportunities] = useState<BoxOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOpportunities = async () => {
      if (!userProfile?.company_id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch existing boxes to filter out boxes already in inventory
        const { data: existingBoxes } = await supabase
          .from('boxes')
          .select('sku')
          .eq('company_id', userProfile.company_id)
          .eq('is_active', true);

        const existingBoxSkus = new Set(
          (existingBoxes || []).map(box => box.sku).filter(Boolean)
        );

        // Get the most recent packaging intelligence report
        const { data: reports, error } = await supabase
          .from('packaging_intelligence_reports')
          .select('top_5_box_discrepancies')
          .eq('company_id', userProfile.company_id)
          .order('generated_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (reports && reports.length > 0 && reports[0].top_5_box_discrepancies) {
          const discrepancies = reports[0].top_5_box_discrepancies as unknown as BoxOpportunity[];
          // Filter out boxes that already exist in inventory
          const availableOpportunities = discrepancies.filter(
            opp => !existingBoxSkus.has(opp.master_box_sku)
          );
          // Get top 3 opportunities from filtered list
          setOpportunities(availableOpportunities.slice(0, 3));
        } else {
          setOpportunities([]);
        }
      } catch (error) {
        console.error('Error fetching box opportunities:', error);
        setOpportunities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunities();
  }, [userProfile?.company_id]);

  return { opportunities, loading };
};

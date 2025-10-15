import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subMonths, startOfMonth } from 'date-fns';

interface MonthlyParcelData {
  month: string;
  parcels: number;
}

interface CarrierPerformanceData {
  name: string;
  value: number;
}

export const useDashboardCharts = () => {
  const { userProfile } = useAuth();
  const [parcelData, setParcelData] = useState<MonthlyParcelData[]>([]);
  const [carrierData, setCarrierData] = useState<CarrierPerformanceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      if (!userProfile?.company_id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch parcel volume data for last 6 months
        const sixMonthsAgo = subMonths(new Date(), 6);
        
        const { data: shipments, error: shipmentsError } = await supabase
          .from('shipments')
          .select('created_at')
          .eq('company_id', userProfile.company_id)
          .gte('created_at', sixMonthsAgo.toISOString());

        if (shipmentsError) throw shipmentsError;

        // Group shipments by month
        const monthlyGroups: { [key: string]: number } = {};
        
        // Initialize last 6 months with 0
        for (let i = 5; i >= 0; i--) {
          const month = subMonths(new Date(), i);
          const monthKey = format(startOfMonth(month), 'MMM');
          monthlyGroups[monthKey] = 0;
        }

        // Count shipments per month
        shipments?.forEach(shipment => {
          const monthKey = format(new Date(shipment.created_at), 'MMM');
          if (monthlyGroups[monthKey] !== undefined) {
            monthlyGroups[monthKey]++;
          }
        });

        const parcelVolumeData = Object.entries(monthlyGroups).map(([month, parcels]) => ({
          month,
          parcels
        }));

        setParcelData(parcelVolumeData);

        // Fetch carrier performance data (last 90 days)
        const ninetyDaysAgo = subMonths(new Date(), 3);
        
        const { data: deliveredShipments, error: deliveryError } = await supabase
          .from('shipments')
          .select('actual_delivery_date, estimated_delivery_date')
          .eq('company_id', userProfile.company_id)
          .eq('status', 'delivered')
          .not('actual_delivery_date', 'is', null)
          .not('estimated_delivery_date', 'is', null)
          .gte('created_at', ninetyDaysAgo.toISOString());

        if (deliveryError) throw deliveryError;

        // Calculate on-time, delayed, and early deliveries
        let onTime = 0;
        let delayed = 0;
        let early = 0;

        deliveredShipments?.forEach(shipment => {
          const actualDate = new Date(shipment.actual_delivery_date!);
          const estimatedDate = new Date(shipment.estimated_delivery_date!);
          
          if (actualDate <= estimatedDate) {
            onTime++;
          } else if (actualDate > estimatedDate) {
            delayed++;
          }
          
          // Check if delivered more than 1 day early
          const daysDiff = (estimatedDate.getTime() - actualDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff >= 1) {
            early++;
            onTime--; // Don't count as on-time if early
          }
        });

        const total = deliveredShipments?.length || 1; // Avoid division by zero

        setCarrierData([
          { name: 'On Time', value: Math.round((onTime / total) * 100) },
          { name: 'Delayed', value: Math.round((delayed / total) * 100) },
          { name: 'Early', value: Math.round((early / total) * 100) }
        ]);

      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [userProfile?.company_id]);

  return { parcelData, carrierData, loading };
};

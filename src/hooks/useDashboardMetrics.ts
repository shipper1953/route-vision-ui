
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context';

interface DashboardMetrics {
  totalOrders: number;
  activeShipments: number;
  deliveredToday: number;
  onTimeDeliveryRate: number;
  ordersToShip: number;
  totalRevenue: number;
  loading: boolean;
}

export const useDashboardMetrics = (): DashboardMetrics => {
  const { user, userProfile } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalOrders: 0,
    activeShipments: 0,
    deliveredToday: 0,
    onTimeDeliveryRate: 0,
    ordersToShip: 0,
    totalRevenue: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user?.id || !userProfile?.company_id) {
        setMetrics(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        // Get total orders for the company
        const { count: totalOrders } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userProfile.company_id);

        // Get active shipments (created, in_transit, etc) for the company
        const { count: activeShipments } = await supabase
          .from('shipments')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userProfile.company_id)
          .in('status', ['created', 'in_transit', 'pre_transit']);

        // Get orders ready to ship for the company
        const { count: ordersToShip } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userProfile.company_id)
          .eq('status', 'ready_to_ship');

        // Get delivered shipments today for the company
        const today = new Date().toISOString().split('T')[0];
        const { count: deliveredToday } = await supabase
          .from('shipments')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userProfile.company_id)
          .eq('status', 'delivered')
          .gte('actual_delivery_date', today);

        // Calculate on-time delivery rate for the company
        const { data: deliveredShipments } = await supabase
          .from('shipments')
          .select('actual_delivery_date, estimated_delivery_date')
          .eq('company_id', userProfile.company_id)
          .eq('status', 'delivered')
          .not('actual_delivery_date', 'is', null)
          .not('estimated_delivery_date', 'is', null);

        let onTimeCount = 0;
        if (deliveredShipments && deliveredShipments.length > 0) {
          onTimeCount = deliveredShipments.filter(shipment => {
            const actualDate = new Date(shipment.actual_delivery_date!);
            const estimatedDate = new Date(shipment.estimated_delivery_date!);
            return actualDate <= estimatedDate;
          }).length;
        }

        const onTimeDeliveryRate = deliveredShipments?.length 
          ? Math.round((onTimeCount / deliveredShipments.length) * 100)
          : 0;

        // Calculate total revenue from orders for the company
        const { data: orderValues } = await supabase
          .from('orders')
          .select('value')
          .eq('company_id', userProfile.company_id);

        const totalRevenue = orderValues?.reduce((sum, order) => 
          sum + (Number(order.value) || 0), 0) || 0;

        setMetrics({
          totalOrders: totalOrders || 0,
          activeShipments: activeShipments || 0,
          deliveredToday: deliveredToday || 0,
          onTimeDeliveryRate,
          ordersToShip: ordersToShip || 0,
          totalRevenue,
          loading: false,
        });

      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        setMetrics(prev => ({ ...prev, loading: false }));
      }
    };

    fetchMetrics();
  }, [user?.id, userProfile?.company_id]);

  return metrics;
};

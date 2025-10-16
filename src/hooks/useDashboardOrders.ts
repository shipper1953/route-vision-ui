import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DashboardOrder {
  id: number;
  order_id: string;
  customer_name: string | null;
  customer_company: string | null;
  shipping_address: any;
  status: string;
  order_date: string;
  required_delivery_date: string | null;
}

export const useDashboardOrders = () => {
  const { userProfile } = useAuth();
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!userProfile?.company_id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id, order_id, customer_name, customer_company, shipping_address, status, order_date, required_delivery_date')
          .eq('company_id', userProfile.company_id)
          .in('status', ['ready_to_ship', 'partially_fulfilled'])
          .order('order_date', { ascending: true })
          .limit(5);

        if (error) throw error;

        setOrders(data || []);
      } catch (error) {
        console.error('Error fetching orders to ship:', error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userProfile?.company_id]);

  return { orders, loading };
};

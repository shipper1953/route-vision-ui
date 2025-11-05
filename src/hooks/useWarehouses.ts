import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Warehouse {
  id: string;
  name: string;
  address: any;
  is_default: boolean | null;
  company_id: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export const useWarehouses = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();

  useEffect(() => {
    if (userProfile?.company_id) {
      fetchWarehouses();
    }
  }, [userProfile?.company_id]);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
      toast.error('Failed to fetch warehouses');
    } finally {
      setLoading(false);
    }
  };

  return { warehouses, loading, fetchWarehouses };
};

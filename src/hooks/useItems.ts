import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Item {
  id: string;
  company_id: string;
  customer_id?: string;
  sku: string;
  name: string;
  category: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  is_active: boolean;
  shopify_product_id?: string;
  shopify_variant_id?: string;
  shopify_store_id?: string;
  created_at: string;
  updated_at: string;
  dimensions_updated_at?: string;
}

export const useItems = (customerId?: string) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();

  const fetchItems = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);
      let query = supabase
        .from('items')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('name');

      // Filter by customer if provided
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setItems((data as Item[]) || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [userProfile?.company_id, customerId]);

  return {
    items,
    loading,
    fetchItems
  };
};

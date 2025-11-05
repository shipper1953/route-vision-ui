import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface WarehouseLocation {
  id: string;
  warehouse_id: string;
  name: string;
  zone?: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  location_type: string;
  is_active: boolean;
}

export const useWarehouseLocations = () => {
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();

  useEffect(() => {
    if (userProfile?.company_id) {
      fetchLocations();
    }
  }, [userProfile?.company_id]);

  const fetchLocations = async (warehouseId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('warehouse_locations' as any)
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .eq('is_active', true);

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;

      setLocations(data as unknown as WarehouseLocation[] || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Failed to fetch warehouse locations');
    } finally {
      setLoading(false);
    }
  };

  const createLocation = async (locationData: Omit<WarehouseLocation, 'id'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('warehouse_locations' as any)
        .insert({
          ...locationData,
          company_id: userProfile?.company_id
        })
        .select()
        .single();

      if (error) throw error;

      setLocations(prev => [...prev, data as unknown as WarehouseLocation]);
      toast.success('Location created successfully');
      return data;
    } catch (error) {
      console.error('Error creating location:', error);
      toast.error('Failed to create location');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    locations,
    loading,
    fetchLocations,
    createLocation
  };
};

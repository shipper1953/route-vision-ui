
import { useState, useEffect } from 'react';
import { Shipment } from "@/components/shipment/ShipmentsTable";
import { supabase } from "@/integrations/supabase/client";

/**
 * Custom hook to load shipments from Supabase
 */
export const useSupabaseShipments = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const loadShipmentsFromSupabase = async () => {
      try {
        const { data: supabaseShipments, error } = await supabase
          .from('shipments')
          .select('*')
          .order('id', { ascending: false });
        
        console.log("Supabase shipments query result:", { data: supabaseShipments, error });
        
        if (error) {
          throw new Error(`Supabase error: ${error.message}`);
        }
        
        if (!supabaseShipments?.length) {
          setShipments([]);
          return;
        }
        
        // Transform Supabase data to match our interface
        const formattedShipments: Shipment[] = supabaseShipments.map(s => ({
          id: (s as any).easypost_id || String(s.id),
          tracking: (s as any).tracking_number || 'Pending',
          carrier: s.carrier || 'Unknown',
          carrierUrl: (s as any).tracking_url || 
            ((s as any).tracking_number ? 
              `https://www.trackingmore.com/track/en/${(s as any).tracking_number}` : '#'),
          service: s.service || 'Standard',
          origin: 'Origin', // We don't have origin/destination data in current schema
          destination: 'Destination',
          shipDate: new Date().toLocaleDateString(), // Use current date since we don't have ship_date
          estimatedDelivery: s.estimated_delivery_date ? 
            new Date(s.estimated_delivery_date).toLocaleDateString() : null,
          actualDelivery: s.actual_delivery_date ? 
            new Date(s.actual_delivery_date).toLocaleDateString() : null,
          status: s.status || 'created',
          weight: `${(s as any).package_weights ? 
            JSON.parse((s as any).package_weights as string)?.weight || '0' : '0'} ${
            (s as any).package_weights ? 
            JSON.parse((s as any).package_weights as string)?.weight_unit || 'oz' : 'oz'}`,
          labelUrl: (s as any).label_url
        }));
        
        setShipments(formattedShipments);
      } catch (err) {
        console.error("Error loading shipments from Supabase:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setShipments([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadShipmentsFromSupabase();
  }, []);
  
  return { shipments, loading, error };
};

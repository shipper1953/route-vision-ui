
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
          .order('created_at', { ascending: false });
        
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
          id: s.easypost_id || String(s.id),
          tracking: s.tracking_number || 'Pending',
          carrier: s.carrier || 'Unknown',
          carrierUrl: s.tracking_number ? 
            `https://www.trackingmore.com/track/en/${s.tracking_number}` : '#',
          service: s.carrier_service || 'Standard',
          origin: s.origin_address ? 'Origin' : 'Unknown Origin',
          destination: s.destination_address ? 'Destination' : 'Unknown Destination',
          shipDate: new Date(s.created_at).toLocaleDateString(),
          estimatedDelivery: s.estimated_delivery_date ? 
            new Date(s.estimated_delivery_date).toLocaleDateString() : null,
          actualDelivery: s.actual_delivery_date ? 
            new Date(s.actual_delivery_date).toLocaleDateString() : null,
          status: s.status || 'created',
          weight: `${s.weight || '0'} lbs`,
          labelUrl: s.label_url
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


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
        // Get all shipments with their related order data
        const { data: supabaseShipments, error: shipmentsError } = await supabase
          .from('shipments')
          .select(`
            *,
            orders!left (
              order_id,
              customer_name,
              shipping_address,
              qboid_dimensions
            )
          `)
          .order('id', { ascending: false });
        
        console.log("Supabase shipments query result:", { data: supabaseShipments, error: shipmentsError });
        
        if (shipmentsError) {
          throw new Error(`Supabase error: ${shipmentsError.message}`);
        }
        
        if (!supabaseShipments?.length) {
          console.log("No shipments found in Supabase");
          setShipments([]);
          return;
        }
        
        // Transform Supabase data to match our interface
        const formattedShipments: Shipment[] = supabaseShipments.map(s => {
          const orderData = Array.isArray(s.orders) ? s.orders[0] : s.orders;
          
          // Get dimensions from order if available, otherwise from shipment
          let weight = 'Unknown';
          if (orderData?.qboid_dimensions) {
            try {
              const dimensions = typeof orderData.qboid_dimensions === 'string' 
                ? JSON.parse(orderData.qboid_dimensions) 
                : orderData.qboid_dimensions;
              if (dimensions && typeof dimensions === 'object' && 'weight' in dimensions) {
                weight = `${dimensions.weight} oz`;
              }
            } catch (e) {
              console.warn("Error parsing qboid dimensions:", e);
            }
          } else if (s.package_weights) {
            try {
              const weights = typeof s.package_weights === 'string' 
                ? JSON.parse(s.package_weights) 
                : s.package_weights;
              if (weights && typeof weights === 'object' && 'weight' in weights) {
                weight = `${weights.weight || '0'} ${weights.weight_unit || 'oz'}`;
              }
            } catch (e) {
              console.warn("Error parsing package weights:", e);
            }
          }
          
          // Determine origin and destination
          let origin = 'Origin';
          let destination = 'Destination';
          
          if (orderData?.shipping_address) {
            try {
              const address = typeof orderData.shipping_address === 'string'
                ? JSON.parse(orderData.shipping_address)
                : orderData.shipping_address;
              if (address && typeof address === 'object' && 'city' in address && 'state' in address) {
                destination = `${address.city || 'Unknown'}, ${address.state || 'Unknown'}`;
              }
            } catch (e) {
              console.warn("Error parsing shipping address:", e);
            }
          }
          
          // Use estimated_delivery_date or actual_delivery_date as shipDate fallback since created_at doesn't exist
          const shipDate = s.estimated_delivery_date ? 
            new Date(s.estimated_delivery_date).toLocaleDateString() : 
            new Date().toLocaleDateString();
          
          return {
            id: s.easypost_id || String(s.id),
            tracking: s.tracking_number || 'Pending',
            carrier: s.carrier || 'Unknown',
            carrierUrl: s.tracking_url || 
              (s.tracking_number ? 
                `https://www.trackingmore.com/track/en/${s.tracking_number}` : '#'),
            service: s.service || 'Standard',
            origin,
            destination,
            shipDate,
            estimatedDelivery: s.estimated_delivery_date ? 
              new Date(s.estimated_delivery_date).toLocaleDateString() : null,
            actualDelivery: s.actual_delivery_date ? 
              new Date(s.actual_delivery_date).toLocaleDateString() : null,
            status: s.status || 'created',
            weight,
            labelUrl: s.label_url
          };
        });
        
        console.log(`Formatted ${formattedShipments.length} shipments from Supabase`);
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


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
        console.log("Loading shipments from Supabase...");
        
        // Get current user to ensure we only fetch their shipments
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log("No authenticated user found");
          setShipments([]);
          setLoading(false);
          return;
        }

        // Get all shipments for the current user with their related order data
        // Use order_shipments join table to link shipments to orders
        const { data: supabaseShipments, error: shipmentsError } = await supabase
          .from('shipments')
          .select(`
            *,
            order_shipments!left (
              orders!inner (
                id,
                order_id,
                customer_name,
                shipping_address,
                qboid_dimensions
              )
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        console.log("Supabase shipments query result:", { data: supabaseShipments, error: shipmentsError });
        
        if (shipmentsError) {
          throw new Error(`Supabase error: ${shipmentsError.message}`);
        }
        
        if (!supabaseShipments?.length) {
          console.log("No shipments found in Supabase for current user");
          setShipments([]);
          return;
        }
        
        // Transform Supabase data to match our interface
        const formattedShipments: Shipment[] = supabaseShipments.map(s => {
          // Extract order data from order_shipments join
          const orderShipment = Array.isArray(s.order_shipments) ? s.order_shipments[0] : s.order_shipments;
          const orderData = orderShipment?.orders;
          
          // Get weight information
          let weight = 'Unknown';
          if (s.package_weights) {
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
          } else if (s.weight) {
            weight = s.weight.includes('oz') || s.weight.includes('lb') ? s.weight : `${s.weight} oz`;
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
          
          // Use created_at for ship date
          const shipDate = s.created_at ? 
            new Date(s.created_at).toLocaleDateString() : 
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
            labelUrl: s.label_url,
            orderId: orderData?.id,
            orderNumber: orderData?.order_id
          };
        });
        
        console.log(`Formatted ${formattedShipments.length} shipments from Supabase for user ${user.email}`);
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


import { useState, useEffect } from 'react';
import { Shipment } from "@/components/shipment/ShipmentsTable";
import { toast } from "sonner";
import { sampleShipments } from "@/types/shipmentTypes";
import { 
  mergeShipments, 
  loadShipmentsFromLocalStorage, 
  saveShipmentsToLocalStorage 
} from "@/utils/shipmentDataUtils";
import { useSupabaseShipments } from "./useSupabaseShipments";
import { useOrderShipments } from "./useOrderShipments";
import { usePurchasedLabelHandler } from "./usePurchasedLabelHandler";

export const useShipmentData = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get shipments from various sources
  const { shipments: supabaseShipments, loading: loadingSupabase, error: supabaseError } = useSupabaseShipments();
  const { shipments: orderShipments, loading: loadingOrders } = useOrderShipments();
  
  // Handle newly purchased labels
  usePurchasedLabelHandler(shipments, setShipments);

  // Load and merge shipments from all sources
  useEffect(() => {
    const loadAllShipments = async () => {
      try {
        console.log("Loading shipments from all sources...");
        console.log("Supabase shipments:", supabaseShipments.length);
        console.log("Order shipments:", orderShipments.length);
        
        // Get local storage shipments
        const localStorageShipments = loadShipmentsFromLocalStorage();
        console.log("Local storage shipments:", localStorageShipments.length);
        
        // Always prioritize Supabase shipments as the primary source
        if (supabaseShipments.length > 0) {
          // Merge all sources with Supabase taking priority
          const mergedShipments = mergeShipments(
            supabaseShipments, 
            [...localStorageShipments, ...orderShipments]
          );
          
          console.log("Using Supabase as primary source, merged total:", mergedShipments.length);
          setShipments(mergedShipments);
          saveShipmentsToLocalStorage(mergedShipments);
          
        } else if (localStorageShipments.length > 0 || orderShipments.length > 0) {
          // If no Supabase shipments, merge local storage and order shipments
          const mergedShipments = mergeShipments(localStorageShipments, orderShipments);
          console.log("No Supabase shipments, using local/order sources, total:", mergedShipments.length);
          setShipments(mergedShipments);
          saveShipmentsToLocalStorage(mergedShipments);
          
        } else {
          // Use sample data only if nothing else is available
          console.log("No shipments found from any source, using sample data");
          setShipments(sampleShipments);
        }
        
        // Log any Supabase errors but don't fail completely
        if (supabaseError) {
          console.warn("Supabase shipments error (continuing with other sources):", supabaseError);
          toast.warning("Could not load some shipment data from database");
        }
        
      } catch (err) {
        console.error("Error loading shipments:", err);
        toast.error("Could not load shipments. Showing available data instead.");
        
        // Try to load from localStorage as fallback
        const localStorageShipments = loadShipmentsFromLocalStorage();
        if (localStorageShipments.length > 0) {
          setShipments(localStorageShipments);
        } else {
          // As a last resort, use sample data
          setShipments(sampleShipments);
        }
      } finally {
        setLoading(false);
      }
    };
    
    // Only load when both sources have finished loading
    if (!loadingSupabase && !loadingOrders) {
      loadAllShipments();
    }
  }, [supabaseShipments, orderShipments, loadingSupabase, loadingOrders, supabaseError]);

  return {
    shipments,
    loading: loading || loadingSupabase || loadingOrders
  };
};


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
  const { shipments: supabaseShipments, loading: loadingSupabase } = useSupabaseShipments();
  const { shipments: orderShipments, loading: loadingOrders } = useOrderShipments();
  
  // Handle newly purchased labels
  usePurchasedLabelHandler(shipments, setShipments);

  // Load and merge shipments from all sources
  useEffect(() => {
    const loadAllShipments = async () => {
      try {
        // Get local storage shipments
        const localStorageShipments = loadShipmentsFromLocalStorage();
        
        // Check if we have shipments from any source
        if (supabaseShipments.length > 0) {
          // If we have Supabase shipments, use them as the primary source and merge others
          const mergedShipments = mergeShipments(
            supabaseShipments, 
            [...localStorageShipments, ...orderShipments]
          );
          
          setShipments(mergedShipments);
          saveShipmentsToLocalStorage(mergedShipments);
          
        } else if (localStorageShipments.length > 0 || orderShipments.length > 0) {
          // If we have local storage or order shipments, merge them
          const mergedShipments = mergeShipments([], [...localStorageShipments, ...orderShipments]);
          setShipments(mergedShipments);
          saveShipmentsToLocalStorage(mergedShipments);
          
        } else {
          // Use sample data if nothing else is available
          console.log("No shipments found from any source, using sample data");
          setShipments(sampleShipments);
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
  }, [supabaseShipments, orderShipments, loadingSupabase, loadingOrders]);

  return {
    shipments,
    loading: loading || loadingSupabase || loadingOrders
  };
};

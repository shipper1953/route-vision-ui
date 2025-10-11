import { useState, useEffect, useMemo } from 'react';
import { Shipment } from "@/components/shipment/ShipmentsTable";
import { toast } from "sonner";
import { useSupabaseShipments } from "./useSupabaseShipments";
import { useOrderShipments } from "./useOrderShipments";
import { usePurchasedLabelHandler } from "./usePurchasedLabelHandler";
import { 
  loadShipmentsFromLocalStorage, 
  saveShipmentsToLocalStorage 
} from "@/utils/shipmentDataUtils";
import { sampleShipments } from "@/types/shipmentTypes";

const PAGE_SIZE = 10;

export const usePaginatedShipments = () => {
  const [allShipments, setAllShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Get shipments from various sources
  const { shipments: supabaseShipments, loading: loadingSupabase, error: supabaseError } = useSupabaseShipments();
  const { shipments: orderShipments, loading: loadingOrders } = useOrderShipments();
  
  // Handle newly purchased labels
  usePurchasedLabelHandler(allShipments, setAllShipments);

  // Load and merge shipments from all sources
  useEffect(() => {
    const loadAllShipments = async () => {
      try {
        console.log("Loading shipments from all sources...");
        console.log("Supabase shipments:", supabaseShipments.length);
        console.log("Order shipments:", orderShipments.length);
        
        // Always prioritize Supabase shipments as the primary source
        if (supabaseShipments.length > 0) {
          console.log("Using Supabase as primary source, total:", supabaseShipments.length);
          setAllShipments(supabaseShipments);
          saveShipmentsToLocalStorage(supabaseShipments);
          
        } else if (orderShipments.length > 0) {
          // If no Supabase shipments, use order shipments
          console.log("No Supabase shipments, using order sources, total:", orderShipments.length);
          setAllShipments(orderShipments);
          saveShipmentsToLocalStorage(orderShipments);
          
        } else {
          // Get local storage shipments as fallback
          const localStorageShipments = loadShipmentsFromLocalStorage();
          console.log("Local storage shipments:", localStorageShipments.length);
          
          if (localStorageShipments.length > 0) {
            console.log("Using local storage shipments, total:", localStorageShipments.length);
            setAllShipments(localStorageShipments);
          } else {
            // Use sample data only if nothing else is available
            console.log("No shipments found from any source, using sample data");
            setAllShipments(sampleShipments);
          }
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
          setAllShipments(localStorageShipments);
        } else {
          // As a last resort, use sample data
          setAllShipments(sampleShipments);
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

  // Filter shipments based on search term
  const filteredShipments = useMemo(() => {
    if (!searchTerm) return allShipments;
    
    const term = searchTerm.toLowerCase();
    return allShipments.filter(shipment => 
      shipment.id?.toLowerCase().includes(term) ||
      shipment.tracking?.toLowerCase().includes(term) ||
      shipment.carrier?.toLowerCase().includes(term) ||
      shipment.destination?.toLowerCase().includes(term)
    );
  }, [allShipments, searchTerm]);

  // Calculate pagination
  const totalCount = filteredShipments.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  
  // Get current page shipments
  const paginatedShipments = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return filteredShipments.slice(startIndex, endIndex);
  }, [filteredShipments, currentPage]);

  // Pagination controls
  const goToPage = useMemo(() => (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useMemo(() => () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const previousPage = useMemo(() => () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return {
    shipments: paginatedShipments,
    loading: loading || loadingSupabase || loadingOrders,
    currentPage,
    totalPages,
    totalCount,
    pageSize: PAGE_SIZE,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    searchTerm,
    setSearchTerm,
    goToPage,
    nextPage,
    previousPage
  };
};

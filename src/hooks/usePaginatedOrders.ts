import { useState, useEffect, useCallback } from "react";
import { OrderData } from "@/types/orderTypes";
import { fetchOrdersPaginated, PaginatedOrdersResult } from "@/services/orderFetchPaginated";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const usePaginatedOrders = (pageSize: number = 10) => {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  const loadOrders = useCallback(async (page: number, search?: string) => {
    try {
      const isSearching = search !== undefined;
      if (isSearching) {
        setSearchLoading(true);
      } else {
        setLoading(true);
      }

      const result = await fetchOrdersPaginated(page, pageSize, search || searchTerm);
      
      setOrders(result.orders);
      setTotalCount(result.totalCount);
      setHasNextPage(result.hasNextPage);
      setHasPreviousPage(result.hasPreviousPage);
      setCurrentPage(page);
      
      console.log(`Loaded page ${page}: ${result.orders.length} orders, total: ${result.totalCount}`);
    } catch (error) {
      console.error("Error loading orders:", error);
      setOrders([]);
      setTotalCount(0);
      setHasNextPage(false);
      setHasPreviousPage(false);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  }, [pageSize, searchTerm]);

  // Initial load
  useEffect(() => {
    loadOrders(1);
  }, [loadOrders]);

  // Search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim() !== '') {
        loadOrders(1, searchTerm);
      } else {
        loadOrders(1, '');
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, loadOrders]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' }, 
        async (payload) => {
          console.log('Realtime order update:', payload);
          
          // Refresh current page on any change
          await loadOrders(currentPage);
          
          if (payload.eventType === 'UPDATE' && payload.new?.status === 'shipped') {
            toast.success(`Order ${payload.new.id} marked as shipped`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentPage, loadOrders]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= Math.ceil(totalCount / pageSize)) {
      loadOrders(page);
    }
  }, [totalCount, pageSize, loadOrders]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      goToPage(currentPage + 1);
    }
  }, [hasNextPage, currentPage, goToPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      goToPage(currentPage - 1);
    }
  }, [hasPreviousPage, currentPage, goToPage]);

  const refreshOrders = useCallback(() => {
    loadOrders(currentPage);
  }, [currentPage, loadOrders]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    orders,
    loading,
    searchLoading,
    currentPage,
    totalCount,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    searchTerm,
    setSearchTerm,
    goToPage,
    nextPage,
    previousPage,
    refreshOrders,
    pageSize
  };
};
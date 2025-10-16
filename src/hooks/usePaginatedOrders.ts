import { useState, useEffect, useCallback, useRef } from "react";
import { OrderData } from "@/types/orderTypes";
import { fetchOrdersPaginated, PaginatedOrdersResult } from "@/services/orderFetchPaginated";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const usePaginatedOrders = (pageSize: number = 10, initialStatusFilter: string = 'all') => {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastReloadRef = useRef<number>(0);
  const MIN_RELOAD_INTERVAL = 1000; // 1 second minimum between reloads

  const loadOrders = useCallback(async (page: number, search?: string, status?: string) => {
    try {
      const isSearching = search !== undefined;
      if (isSearching) {
        setSearchLoading(true);
      } else {
        setLoading(true);
      }

      const currentStatus = status !== undefined ? status : statusFilter;
      const result = await fetchOrdersPaginated(page, pageSize, search || searchTerm, currentStatus);
      
      setOrders(result.orders);
      setTotalCount(result.totalCount);
      setHasNextPage(result.hasNextPage);
      setHasPreviousPage(result.hasPreviousPage);
      setCurrentPage(page);
      
      console.log(`Loaded page ${page}: ${result.orders.length} orders, total: ${result.totalCount}, status: ${currentStatus}`);
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
  }, [pageSize, searchTerm, statusFilter]);

  // Initial load
  useEffect(() => {
    loadOrders(1, '', initialStatusFilter);
  }, []);

  // Search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadOrders(1, searchTerm, statusFilter);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter]);

  // Realtime updates with debouncing and rate limiting
  useEffect(() => {
    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'orders' }, 
        async (payload) => {
          console.log('Realtime order update:', payload);
          
          // Clear any pending reload
          if (reloadTimeoutRef.current) {
            clearTimeout(reloadTimeoutRef.current);
          }
          
          // Check if enough time has passed since last reload
          const now = Date.now();
          const timeSinceLastReload = now - lastReloadRef.current;
          
          if (timeSinceLastReload < MIN_RELOAD_INTERVAL) {
            // Debounce: wait before reloading
            reloadTimeoutRef.current = setTimeout(() => {
              lastReloadRef.current = Date.now();
              loadOrders(currentPage);
            }, MIN_RELOAD_INTERVAL - timeSinceLastReload);
          } else {
            // Enough time has passed, reload immediately
            lastReloadRef.current = now;
            await loadOrders(currentPage);
          }
          
          if (payload.eventType === 'UPDATE' && payload.new?.status === 'shipped') {
            toast.success(`Order ${payload.new.id} marked as shipped`);
          }
        }
      )
      .subscribe();

    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
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
    pageSize,
    statusFilter,
    setStatusFilter,
  };
};
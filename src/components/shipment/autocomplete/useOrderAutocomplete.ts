
import { useState, useMemo, useCallback } from "react";
import { fetchOrders } from "@/services/orderService";
import { OrderData } from "@/services/orderService";
import { useQuery } from "@tanstack/react-query";

export const useOrderAutocomplete = () => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Use React Query to fetch orders with caching
  const { data: orders = [], isLoading: loading } = useQuery({
    queryKey: ['orders', 'ready_to_ship'],
    queryFn: fetchOrders,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  // Filter orders to only show ready to ship orders
  const readyToShipOrders = useMemo(() => {
    return orders.filter(order => order.status === 'ready_to_ship');
  }, [orders]);

  // Filter orders based on input value
  const filteredOrders = useMemo(() => {
    // Ensure inputValue is a string and handle undefined/null cases
    const searchValue = typeof inputValue === 'string' ? inputValue.trim() : '';
    
    if (!searchValue) return readyToShipOrders;
    
    const searchTerm = searchValue.toLowerCase();
    return readyToShipOrders.filter(order => {
      const orderId = String(order.id || '').toLowerCase();
      const customerName = String(order.customerName || '').toLowerCase();
      return orderId.includes(searchTerm) || customerName.includes(searchTerm);
    });
  }, [readyToShipOrders, inputValue]);

  const handleSelect = useCallback((order: OrderData, onOrderSelected: (order: OrderData) => void) => {
    console.log("Order selected:", order);
    setSelectedOrderId(order.id);
    setInputValue(order.id); // Display the order ID in the input
    setOpen(false);
    onOrderSelected(order);
  }, []);

  const handleInputChange = useCallback((value: string) => {
    // Ensure we always set a string value
    const stringValue = typeof value === 'string' ? value : '';
    setInputValue(stringValue);
    setOpen(!!stringValue.trim());
  }, []);

  const handleInputFocus = useCallback(() => {
    setOpen(true);
  }, []);

  const handleInputBlur = useCallback((e: React.FocusEvent) => {
    // Delay closing to allow for selection
    setTimeout(() => {
      if (e.currentTarget && !e.currentTarget.contains(document.activeElement)) {
        setOpen(false);
      }
    }, 150);
  }, []);

  return {
    open,
    setOpen,
    loading,
    inputValue,
    filteredOrders,
    selectedOrderId,
    handleSelect,
    handleInputChange,
    handleInputFocus,
    handleInputBlur,
  };
};

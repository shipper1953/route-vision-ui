
import { useState, useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { fetchOrders, OrderData } from "@/services/orderService";
import { ShipmentForm } from "@/types/shipment";
import { toast } from "sonner";

export const useOrderAutocomplete = () => {
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const form = useFormContext<ShipmentForm>();
  
  const orderBarcode = form.watch("orderBarcode");

  // Load orders when component mounts
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const orderData = await fetchOrders();
        // Filter to only show orders that are ready to ship (no shipment yet)
        const readyToShipOrders = orderData.filter(order => 
          order.status === "ready_to_ship" || (!order.shipment && order.status !== "shipped")
        );
        setOrders(readyToShipOrders);
      } catch (error) {
        console.error("Error loading orders:", error);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  // Sync input value with form value
  useEffect(() => {
    setInputValue(orderBarcode || "");
  }, [orderBarcode]);

  // Filter orders based on input value
  const filteredOrders = useMemo(() => {
    if (!inputValue || inputValue.trim().length === 0) return [];
    
    const searchTerm = inputValue.toLowerCase().trim();
    const matches = orders.filter(order => {
      const orderId = String(order.id || '').toLowerCase();
      const customerName = String(order.customerName || '').toLowerCase();
      
      return orderId.includes(searchTerm) || customerName.includes(searchTerm);
    }).slice(0, 10); // Limit to 10 results for performance

    return matches;
  }, [orders, inputValue]);

  const handleSelect = (order: OrderData, onOrderSelected: (order: OrderData) => void) => {
    setInputValue(String(order.id));
    form.setValue("orderBarcode", String(order.id));
    setOpen(false);
    onOrderSelected(order);
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    form.setValue("orderBarcode", value);
    
    // Show dropdown if there's input and potential matches
    if (value && value.trim().length > 0) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const handleInputFocus = () => {
    // Show dropdown if there are filtered results when input is focused
    if (inputValue && inputValue.trim().length > 0 && filteredOrders.length > 0) {
      setOpen(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Only close dropdown if focus is not moving to a dropdown item
    // Use a small delay to allow for clicks on dropdown items
    setTimeout(() => {
      // Add null check for currentTarget and document.activeElement
      if (e.currentTarget && document.activeElement && !e.currentTarget.contains(document.activeElement)) {
        setOpen(false);
      }
    }, 150);
  };

  return {
    open,
    setOpen,
    orders,
    loading,
    inputValue,
    filteredOrders,
    handleSelect,
    handleInputChange,
    handleInputFocus,
    handleInputBlur,
  };
};

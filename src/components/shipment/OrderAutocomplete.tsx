
import { useState, useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Check, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchOrders, OrderData } from "@/services/orderService";
import { ShipmentForm } from "@/types/shipment";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface OrderAutocompleteProps {
  onOrderSelected: (order: OrderData) => void;
}

export const OrderAutocomplete = ({ onOrderSelected }: OrderAutocompleteProps) => {
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
    const matches = orders.filter(order => 
      order.id.toLowerCase().includes(searchTerm) ||
      order.customerName.toLowerCase().includes(searchTerm)
    ).slice(0, 10); // Limit to 10 results for performance

    // Check for exact match - if found, auto-select it
    const exactMatch = orders.find(order => order.id.toLowerCase() === searchTerm);
    if (exactMatch && inputValue !== exactMatch.id) {
      // Auto-select exact match after a short delay
      setTimeout(() => {
        handleSelect(exactMatch);
      }, 100);
    }

    return matches;
  }, [orders, inputValue]);

  // Show dropdown when there's input, filtered results, and input is focused
  useEffect(() => {
    const shouldShow = inputValue && inputValue.trim().length > 0 && filteredOrders.length > 0;
    setOpen(shouldShow);
  }, [inputValue, filteredOrders]);

  const handleSelect = (order: OrderData) => {
    setInputValue(order.id);
    form.setValue("orderBarcode", order.id);
    setOpen(false);
    onOrderSelected(order);
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    form.setValue("orderBarcode", value);
    
    // If user clears the input, close dropdown
    if (!value || value.trim().length === 0) {
      setOpen(false);
    }
  };

  const handleInputFocus = () => {
    // Show dropdown if there are filtered results when input is focused
    if (inputValue && inputValue.trim().length > 0 && filteredOrders.length > 0) {
      setOpen(true);
    }
  };

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              placeholder="Enter order ID or scan barcode..."
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={handleInputFocus}
              className="pl-10"
            />
            <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner size={16} className="mr-2" />
                  <span className="text-sm text-muted-foreground">Loading orders...</span>
                </div>
              ) : (
                <>
                  <CommandEmpty>No matching ready-to-ship orders found.</CommandEmpty>
                  <CommandGroup heading="Ready to Ship Orders">
                    {filteredOrders.map((order) => (
                      <CommandItem
                        key={order.id}
                        value={order.id}
                        onSelect={() => handleSelect(order)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            inputValue === order.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{order.id}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(order.orderDate).toLocaleDateString()}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground truncate">
                            {order.customerName}
                          </span>
                          {order.requiredDeliveryDate && (
                            <span className="text-xs text-amber-600">
                              Required: {new Date(order.requiredDeliveryDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

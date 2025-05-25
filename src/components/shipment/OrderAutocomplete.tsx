
import { useState, useEffect, useMemo, useRef } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);
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

  const handleSelect = (order: OrderData) => {
    setInputValue(order.id);
    form.setValue("orderBarcode", order.id);
    setOpen(false);
    onOrderSelected(order);
    // Restore focus to input after selection
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
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

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              ref={inputRef}
              placeholder="Enter order ID or scan barcode..."
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              className="pl-10"
              autoComplete="off"
            />
            <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-full p-0 z-50" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList className="max-h-60">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner size={16} className="mr-2" />
                  <span className="text-sm text-muted-foreground">Loading orders...</span>
                </div>
              ) : filteredOrders.length > 0 ? (
                <CommandGroup heading="Ready to Ship Orders">
                  {filteredOrders.map((order) => (
                    <CommandItem
                      key={order.id}
                      value={order.id}
                      onSelect={() => handleSelect(order)}
                      className="cursor-pointer"
                      onMouseDown={(e) => e.preventDefault()} // Prevent input blur
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
              ) : inputValue && inputValue.trim().length > 0 ? (
                <CommandEmpty>No matching ready-to-ship orders found.</CommandEmpty>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

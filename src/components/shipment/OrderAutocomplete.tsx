
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
  const form = useFormContext<ShipmentForm>();
  
  const orderBarcode = form.watch("orderBarcode");

  // Load orders when component mounts
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const orderData = await fetchOrders();
        // Filter to only show orders without shipments (open orders)
        const openOrders = orderData.filter(order => !order.shipment);
        setOrders(openOrders);
      } catch (error) {
        console.error("Error loading orders:", error);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  // Filter orders based on input value
  const filteredOrders = useMemo(() => {
    if (!orderBarcode || orderBarcode.trim().length === 0) return [];
    
    const searchTerm = orderBarcode.toLowerCase().trim();
    return orders.filter(order => 
      order.id.toLowerCase().includes(searchTerm) ||
      order.customerName.toLowerCase().includes(searchTerm)
    ).slice(0, 10); // Limit to 10 results for performance
  }, [orders, orderBarcode]);

  // Show dropdown when there's input and filtered results
  useEffect(() => {
    const shouldShow = orderBarcode && orderBarcode.trim().length > 0 && filteredOrders.length > 0;
    setOpen(shouldShow);
  }, [orderBarcode, filteredOrders]);

  const handleSelect = (order: OrderData) => {
    form.setValue("orderBarcode", order.id);
    setOpen(false);
    onOrderSelected(order);
  };

  const handleInputChange = (value: string) => {
    form.setValue("orderBarcode", value);
  };

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              placeholder="Enter order ID or scan barcode..."
              value={orderBarcode || ""}
              onChange={(e) => handleInputChange(e.target.value)}
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
                  <CommandEmpty>No matching orders found.</CommandEmpty>
                  <CommandGroup heading="Matching Orders">
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
                            orderBarcode === order.id ? "opacity-100" : "opacity-0"
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

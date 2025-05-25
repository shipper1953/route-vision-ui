
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
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Package } from "lucide-react";
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
  const [searchValue, setSearchValue] = useState("");
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

  // Filter orders based on search input
  const filteredOrders = useMemo(() => {
    if (!searchValue.trim()) return orders.slice(0, 10); // Show first 10 if no search
    
    return orders.filter(order => 
      order.id.toLowerCase().includes(searchValue.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchValue.toLowerCase())
    ).slice(0, 10); // Limit to 10 results for performance
  }, [orders, searchValue]);

  // Update search value when orderBarcode changes
  useEffect(() => {
    setSearchValue(orderBarcode || "");
  }, [orderBarcode]);

  const handleSelect = (order: OrderData) => {
    form.setValue("orderBarcode", order.id);
    setSearchValue(order.id);
    setOpen(false);
    onOrderSelected(order);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">
              {orderBarcode ? orderBarcode : "Select or enter order ID..."}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search orders..." 
            value={searchValue}
            onValueChange={(value) => {
              setSearchValue(value);
              form.setValue("orderBarcode", value);
            }}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size={16} className="mr-2" />
                <span className="text-sm text-muted-foreground">Loading orders...</span>
              </div>
            ) : (
              <>
                <CommandEmpty>No open orders found.</CommandEmpty>
                <CommandGroup heading="Open Orders">
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
  );
};

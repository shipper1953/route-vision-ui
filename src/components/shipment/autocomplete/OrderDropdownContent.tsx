
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderData } from "@/services/orderService";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface OrderDropdownContentProps {
  loading: boolean;
  filteredOrders: OrderData[];
  inputValue: string;
  onSelect: (order: OrderData) => void;
}

export const OrderDropdownContent = ({ 
  loading, 
  filteredOrders, 
  inputValue, 
  onSelect 
}: OrderDropdownContentProps) => {
  return (
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
                value={String(order.id)}
                onSelect={() => onSelect(order)}
                className="cursor-pointer"
                onMouseDown={(e) => e.preventDefault()} // Prevent input blur
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    inputValue === String(order.id) ? "opacity-100" : "opacity-0"
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
  );
};

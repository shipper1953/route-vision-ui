
import { useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { OrderData } from "@/services/orderService";
import { useOrderAutocomplete } from "./autocomplete/useOrderAutocomplete";
import { OrderSearchInput } from "./autocomplete/OrderSearchInput";
import { OrderDropdownContent } from "./autocomplete/OrderDropdownContent";

interface OrderAutocompleteProps {
  onOrderSelected: (order: OrderData) => void;
}

export const OrderAutocomplete = ({ onOrderSelected }: OrderAutocompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    open,
    setOpen,
    loading,
    inputValue,
    filteredOrders,
    handleSelect,
    handleInputChange,
    handleInputFocus,
    handleInputBlur,
  } = useOrderAutocomplete();

  const onSelectOrder = (order: OrderData) => {
    handleSelect(order, onOrderSelected);
    // Restore focus to input after selection
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <OrderSearchInput
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </PopoverTrigger>
        <PopoverContent 
          className="w-full p-0 z-50" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <OrderDropdownContent
            loading={loading}
            filteredOrders={filteredOrders}
            inputValue={inputValue}
            onSelect={onSelectOrder}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};


import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Package } from "lucide-react";

interface OrderSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: (e: React.FocusEvent) => void;
}

export const OrderSearchInput = forwardRef<HTMLInputElement, OrderSearchInputProps>(
  ({ value, onChange, onFocus, onBlur }, ref) => {
    return (
      <div className="relative">
        <Input
          ref={ref}
          placeholder="Enter order ID or scan barcode..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          className="pl-10"
          autoComplete="off"
        />
        <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
    );
  }
);

OrderSearchInput.displayName = "OrderSearchInput";

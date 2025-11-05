import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scan } from "lucide-react";

interface BarcodeScanInputProps {
  onScan: (barcode: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const BarcodeScanInput = ({ onScan, disabled, placeholder }: BarcodeScanInputProps) => {
  const [barcode, setBarcode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus on mount and when re-enabled
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && barcode.trim()) {
      onScan(barcode.trim());
      setBarcode("");
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="barcode-scan" className="text-base font-semibold">
        Scan Item Barcode
      </Label>
      <div className="relative">
        <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          id="barcode-scan"
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder || "Scan or enter barcode..."}
          className="pl-10 h-12 text-lg"
          autoComplete="off"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Scan barcode or type manually and press Enter
      </p>
    </div>
  );
};


import { Tornado } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShipTornadoLogoProps {
  className?: string;
  size?: number;
  spin?: boolean;
}

export function ShipTornadoLogo({ className, size = 24, spin = false }: ShipTornadoLogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Tornado 
        size={size} 
        className={cn(
          "text-tms-blue transition-all", 
          spin && "animate-spin"
        )} 
      />
      <span className="font-bold text-lg whitespace-nowrap">Ship Tornado</span>
    </div>
  );
}

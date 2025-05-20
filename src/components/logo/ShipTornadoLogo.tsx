
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
      <div className="relative">
        <Tornado 
          size={size} 
          className={cn(
            "transition-all", 
            spin && "animate-spin",
            className?.includes("text-white") ? "text-white" : "text-tms-blue"
          )} 
          strokeWidth={1.5}
        />
        <div className={cn(
          "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
          "w-3/4 h-3/4 rounded-full opacity-30",
          className?.includes("text-white") ? "bg-white/10" : "bg-tms-blue/10",
          "tornado-move"
        )}></div>
      </div>
      <span className={cn(
        "font-bold text-lg whitespace-nowrap",
        className?.includes("text-white") ? "text-white" : "text-tms-blue"
      )}>Ship Tornado</span>
    </div>
  );
}

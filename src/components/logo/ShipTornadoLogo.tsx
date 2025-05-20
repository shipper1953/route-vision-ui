
import React from "react";
import { cn } from "@/lib/utils";

interface ShipTornadoLogoProps {
  className?: string;
  size?: number;
  spin?: boolean;
}

export function ShipTornadoLogo({ className, size = 24, spin = false }: ShipTornadoLogoProps) {
  const baseSize = size;
  const layerSize = baseSize * 0.8;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        {/* Complex tornado SVG */}
        <svg 
          width={baseSize} 
          height={baseSize} 
          viewBox="0 0 120 120"
          className={cn(
            "transition-all", 
            spin && "tornado-spin",
            className?.includes("text-white") ? "text-white" : "text-tms-navy"
          )}
        >
          {/* Top oval */}
          <ellipse 
            cx="60" cy="30" rx="30" ry="10" 
            className={cn(
              "fill-none stroke-current",
              className?.includes("text-white") ? "stroke-white" : "stroke-slate-100"
            )}
            strokeWidth="3"
            transform="rotate(0)"
          />
          
          {/* Middle layers */}
          <path 
            d="M85 35 C75 48, 45 52, 40 65 C35 78, 65 85, 55 95" 
            className={cn(
              "fill-none stroke-current tornado-layer",
              className?.includes("text-white") ? "stroke-white" : "stroke-slate-100"
            )}
            strokeWidth="5"
            strokeLinecap="round" 
          />
          
          <path 
            d="M35 35 C45 48, 75 52, 80 65 C85 78, 55 85, 65 95" 
            className={cn(
              "fill-none stroke-current tornado-layer",
              className?.includes("text-white") ? "stroke-white/80" : "stroke-slate-300"
            )}
            strokeWidth="6"
            strokeLinecap="round" 
          />
          
          {/* Bottom funnel */}
          <path 
            d="M65 95 L70 110" 
            className={cn(
              "fill-none stroke-current",
              className?.includes("text-white") ? "stroke-white/60" : "stroke-slate-400"
            )}
            strokeWidth="3"
            strokeLinecap="round" 
          />
          
          {/* Background atmosphere effect */}
          <circle 
            cx="60" cy="60" r="40" 
            className={cn(
              "opacity-10",
              className?.includes("text-white") ? "fill-white/5" : "fill-tms-slate/5"
            )}
          />
        </svg>
      </div>
      <span className={cn(
        "font-bold text-lg whitespace-nowrap",
        className?.includes("text-white") ? "text-white" : "text-tms-navy"
      )}>Ship Tornado</span>
    </div>
  );
}

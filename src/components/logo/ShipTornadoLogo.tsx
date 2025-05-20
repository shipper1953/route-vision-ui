
import React from "react";
import { cn } from "@/lib/utils";

interface ShipTornadoLogoProps {
  className?: string;
  size?: number;
  spin?: boolean;
}

export function ShipTornadoLogo({ className, size = 24, spin = false }: ShipTornadoLogoProps) {
  const baseSize = size;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        {/* Tornado SVG with side-to-side animation */}
        <svg 
          width={baseSize} 
          height={baseSize} 
          viewBox="0 0 24 24"
          className={cn(
            "transition-all",
            className?.includes("text-white") ? "text-white" : "text-tms-navy"
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Staggered tornado lines with individual animations */}
          <path d="M21 4H3" className="tornado-line-1" />
          <path d="M18 8H6" className="tornado-line-2" />
          <path d="M15 12H9" className="tornado-line-3" />
          <path d="M12 16H12" className="tornado-line-4" />
          <path d="M12 20H12" className="tornado-line-5" />
        </svg>
      </div>
      <span className={cn(
        "font-bold text-lg whitespace-nowrap",
        className?.includes("text-white") ? "text-white" : "text-tms-navy"
      )}>Ship Tornado</span>
    </div>
  );
}

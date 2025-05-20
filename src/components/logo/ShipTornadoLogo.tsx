
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
        {/* Basic tornado SVG with animation */}
        <svg 
          width={baseSize} 
          height={baseSize} 
          viewBox="0 0 24 24"
          className={cn(
            "transition-all", 
            spin && "tornado-spin",
            className?.includes("text-white") ? "text-white" : "text-tms-navy"
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Simple tornado shape */}
          <path d="M21 4H3" />
          <path d="M18 8H6" />
          <path d="M15 12H9" />
          <path d="M12 16H12" />
          <path d="M12 20H12" />
        </svg>
      </div>
      <span className={cn(
        "font-bold text-lg whitespace-nowrap",
        className?.includes("text-white") ? "text-white" : "text-tms-navy"
      )}>Ship Tornado</span>
    </div>
  );
}

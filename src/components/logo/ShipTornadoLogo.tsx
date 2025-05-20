
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
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative">
        {/* Clean funnel-shaped tornado */}
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
          {/* Clean funnel-shaped tornado with class names for animation */}
          <path d="M21 4H3" className="tornado-line-1" />       {/* top widest */}
          <path d="M19 7H5" className="tornado-line-2" />       {/* slightly shorter */}
          <path d="M17 10H7" className="tornado-line-3" />      {/* medium */}
          <path d="M15 13H9" className="tornado-line-4" />      {/* narrower */}
          <path d="M13 16H11" className="tornado-line-5" />     {/* narrowest */}
        </svg>
      </div>
      
      {/* Vertical divider line */}
      <div className={cn(
        "w-px h-10",
        className?.includes("text-white") ? "bg-white/70" : "bg-tms-navy/30"
      )}></div>
      
      <div className={cn(
        "flex flex-col leading-tight font-bold whitespace-nowrap",
        className?.includes("text-white") ? "text-white" : "text-tms-navy"
      )}>
        <span className="text-lg tracking-wide">Ship</span>
        <span className="text-lg tracking-wide">Tornado</span>
      </div>
    </div>
  );
}

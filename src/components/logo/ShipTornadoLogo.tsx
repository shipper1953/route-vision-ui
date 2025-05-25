
import React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ShipTornadoLogoProps {
  className?: string;
  size?: number;
  spin?: boolean;
}

export function ShipTornadoLogo({ className, size = 24, spin = false }: ShipTornadoLogoProps) {
  const baseSize = size;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center cursor-pointer", className)}>
            <div className="relative">
              {/* Package icon stylized as tornado */}
              <svg 
                width={baseSize} 
                height={baseSize} 
                viewBox="0 0 24 24"
                className={cn(
                  "transition-all text-white", // Always use white color for the logo
                  spin && "tornado-spin"
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
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-white border border-gray-200 shadow-lg p-4 max-w-xs">
          <div className="flex flex-col items-center gap-2">
            <img 
              src="/lovable-uploads/07d8e146-94a1-454a-9892-e4093dc5ce0e.png" 
              alt="SLG The GOAT" 
              className="w-16 h-16 rounded-full object-cover"
            />
            <p className="text-sm font-medium text-gray-900">SLG The GOAT</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

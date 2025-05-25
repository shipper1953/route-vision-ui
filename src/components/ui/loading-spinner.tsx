
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
}

export function LoadingSpinner({ className, size = 24 }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <div className="relative">
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24"
          className="text-tms-blue"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Spinning tornado with class names for animation */}
          <path d="M21 4H3" className="tornado-line-1" />       {/* top widest */}
          <path d="M19 7H5" className="tornado-line-2" />       {/* slightly shorter */}
          <path d="M17 10H7" className="tornado-line-3" />      {/* medium */}
          <path d="M15 13H9" className="tornado-line-4" />      {/* narrower */}
          <path d="M13 16H11" className="tornado-line-5" />     {/* narrowest */}
        </svg>
      </div>
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  );
}

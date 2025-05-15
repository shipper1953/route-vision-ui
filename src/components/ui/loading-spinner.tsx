
import { Tornado } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
}

export function LoadingSpinner({ className, size = 24 }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <Tornado size={size} className="animate-spin text-tms-blue" />
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  );
}

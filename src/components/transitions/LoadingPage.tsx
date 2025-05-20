
import { ShipTornadoLogo } from "@/components/logo/ShipTornadoLogo";
import { cn } from "@/lib/utils";

interface LoadingPageProps {
  className?: string;
}

export function LoadingPage({ className }: LoadingPageProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-screen bg-background",
      className
    )}>
      <div className="flex flex-col items-center gap-4">
        <ShipTornadoLogo size={48} className="text-tms-blue" />
        <p className="text-muted-foreground">Loading your experience...</p>
      </div>
    </div>
  );
}

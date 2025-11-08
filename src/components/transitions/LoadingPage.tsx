
import { TigerFistPumpIcon } from "@/components/ui/loading-spinner";
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
        <TigerFistPumpIcon size={120} className="text-emerald-600" />
        <p className="text-muted-foreground text-center">
          Reliving Tiger&apos;s iconic fist pump while we load your experience...
        </p>
      </div>
    </div>
  );
}

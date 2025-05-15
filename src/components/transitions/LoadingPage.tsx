
import { Tornado } from "lucide-react";
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
        <Tornado size={48} className="tornado-move text-tms-blue" />
        <h1 className="text-2xl font-bold text-tms-blue">Ship Tornado</h1>
        <p className="text-muted-foreground">Loading your experience...</p>
      </div>
    </div>
  );
}

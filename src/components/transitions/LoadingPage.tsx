
import { cn } from "@/lib/utils";
import { getRandomTigerGif } from "@/utils/tigerWoodsGifs";
import { useState, useEffect } from "react";

interface LoadingPageProps {
  className?: string;
}

export function LoadingPage({ className }: LoadingPageProps) {
  const [gifUrl] = useState(() => getRandomTigerGif());

  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-screen bg-background",
      className
    )}>
      <div className="flex flex-col items-center gap-4">
        <img 
          src={gifUrl} 
          alt="Loading..." 
          className="w-64 h-64 object-contain rounded-lg"
        />
        <p className="text-muted-foreground">Loading your experience...</p>
      </div>
    </div>
  );
}

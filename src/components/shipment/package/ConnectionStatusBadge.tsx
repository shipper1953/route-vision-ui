
import { Badge } from "@/components/ui/badge";
import { Check, AlertCircle } from "lucide-react";

interface ConnectionStatusBadgeProps {
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
}

export const ConnectionStatusBadge = ({ connectionStatus }: ConnectionStatusBadgeProps) => {
  if (connectionStatus === 'disconnected') return null;
  
  return (
    <Badge 
      variant={connectionStatus === 'connected' ? "default" : "outline"}
      className={`${connectionStatus === 'connected' ? 'bg-green-500 hover:bg-green-600' : 'bg-amber-500 hover:bg-amber-600'} flex items-center gap-1`}
    >
      {connectionStatus === 'connected' ? (
        <>
          <Check className="h-3 w-3" /> Qboid Connected
        </>
      ) : (
        <>
          <AlertCircle className="h-3 w-3" /> Awaiting Data
        </>
      )}
    </Badge>
  );
};

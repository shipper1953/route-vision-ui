
import { Badge } from "@/components/ui/badge";
import { Check, AlertCircle, Wifi } from "lucide-react";
import { ConnectionStatus } from "./types";

interface ConnectionStatusBadgeProps {
  connectionStatus: ConnectionStatus;
}

export const ConnectionStatusBadge = ({ connectionStatus }: ConnectionStatusBadgeProps) => {
  if (connectionStatus === 'disconnected') return null;
  
  return (
    <Badge 
      variant={
        connectionStatus === 'connected' ? "default" : 
        connectionStatus === 'error' ? "destructive" : "outline"
      }
      className={`${
        connectionStatus === 'connected' ? 'bg-green-500 hover:bg-green-600' : 
        connectionStatus === 'error' ? 'bg-red-500 hover:bg-red-600' : 
        'bg-amber-500 hover:bg-amber-600'
      } flex items-center gap-1`}
    >
      {connectionStatus === 'connected' && (
        <>
          <Check className="h-3 w-3" /> Qboid Connected
        </>
      )}
      {connectionStatus === 'connecting' && (
        <>
          <Wifi className="h-3 w-3 animate-pulse" /> Awaiting Data
        </>
      )}
      {connectionStatus === 'error' && (
        <>
          <AlertCircle className="h-3 w-3" /> Connection Error
        </>
      )}
    </Badge>
  );
};

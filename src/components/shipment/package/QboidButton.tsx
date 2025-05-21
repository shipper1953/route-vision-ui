
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { ConnectionStatus } from "./useQboidConnection";

interface QboidButtonProps {
  connectionStatus: ConnectionStatus;
  configuring: boolean;
  onClick: () => void;
}

export const QboidButton = ({ connectionStatus, configuring, onClick }: QboidButtonProps) => {
  return (
    <Button 
      type="button" 
      onClick={onClick}
      variant={connectionStatus === 'connected' ? "success" : 
              connectionStatus === 'error' ? "destructive" : "outline"}
      className="flex items-center gap-2 mt-2"
      disabled={configuring}
    >
      {connectionStatus === 'disconnected' && (
        <WifiOff className="h-4 w-4" />
      )}
      {connectionStatus === 'connected' && (
        <Wifi className="h-4 w-4" />
      )}
      {connectionStatus === 'error' && (
        <AlertTriangle className="h-4 w-4" />
      )}
      {connectionStatus === 'connecting' && (
        <Wifi className="h-4 w-4 animate-pulse" />
      )}
      <span>
        {configuring 
          ? "Configuring..." 
          : connectionStatus === 'connected' 
            ? "Qboid Connected" 
            : connectionStatus === 'connecting' 
              ? "Awaiting Connection" 
              : connectionStatus === 'error'
                ? "Connection Error" 
                : "Configure Qboid WiFi API"
        }
      </span>
    </Button>
  );
};

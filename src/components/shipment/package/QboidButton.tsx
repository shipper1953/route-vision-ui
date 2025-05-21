
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff } from "lucide-react";

interface QboidButtonProps {
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  configuring: boolean;
  onClick: () => void;
}

export const QboidButton = ({ connectionStatus, configuring, onClick }: QboidButtonProps) => {
  return (
    <Button 
      type="button" 
      onClick={onClick}
      variant={connectionStatus === 'connected' ? "success" : "outline"}
      className="flex items-center gap-2 mt-2"
      disabled={configuring}
    >
      {connectionStatus === 'disconnected' ? (
        <WifiOff className="h-4 w-4" />
      ) : (
        <Wifi className="h-4 w-4" />
      )}
      <span>
        {configuring 
          ? "Configuring..." 
          : connectionStatus === 'connected' 
            ? "Qboid Connected" 
            : connectionStatus === 'connecting' 
              ? "Awaiting Connection" 
              : "Configure Qboid WiFi API"
        }
      </span>
    </Button>
  );
};

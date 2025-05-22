import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { ConnectionStatus } from "./useQboidConnection";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface QboidButtonProps {
  connectionStatus: ConnectionStatus;
  configuring: boolean;
  onClick: () => void;
  deviceIp?: string;
  onDeviceIpChange?: (ip: string) => void;
  configGuide?: any;
}

export const QboidButton = ({ 
  connectionStatus, 
  configuring, 
  onClick,
  deviceIp = "",
  onDeviceIpChange,
  configGuide
}: QboidButtonProps) => {
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  
  const handleButtonClick = () => {
    if (connectionStatus === "connected") {
      // If already connected, show config dialog
      setShowConfigDialog(true);
    } else {
      // Otherwise trigger connection
      onClick();
      setShowConfigDialog(true);
    }
  };
  
  return (
    <>
      <Button 
        type="button" 
        onClick={handleButtonClick}
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
      
      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Qboid WiFi API</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Enter your Qboid device IP address or use the default discovery URL
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="192.168.1.x or qboid.local"
                  value={deviceIp}
                  onChange={(e) => onDeviceIpChange?.(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={onClick} 
                  disabled={configuring}
                >
                  {configuring ? "Connecting..." : "Connect"}
                </Button>
              </div>
            </div>
            
            {configGuide && (
              <div className="space-y-2 border rounded-md p-4 bg-slate-50">
                <h3 className="font-medium">Configuration Instructions</h3>
                <ol className="space-y-1 text-sm">
                  {configGuide.instructions.map((instruction: string, i: number) => (
                    <li key={i} className={i === 0 ? "font-medium" : ""}>
                      {instruction}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground mt-2">
              <p>
                For more information about configuring your Qboid device, visit 
                <a 
                  href="https://testing.qboid.ai/PerceptorAPI.html" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline ml-1"
                >
                  Qboid WiFi API documentation
                </a>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

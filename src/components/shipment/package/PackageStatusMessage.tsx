
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";
import { ConnectionStatus } from "./useQboidConnection";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";

interface PackageStatusMessageProps {
  connectionStatus: ConnectionStatus;
  lastUpdateTime: string | null;
}

export const PackageStatusMessage = ({ connectionStatus, lastUpdateTime }: PackageStatusMessageProps) => {
  const form = useFormContext<ShipmentForm>();
  
  // No message if disconnected and no update time
  if (connectionStatus === 'disconnected' && !lastUpdateTime) return null;
  
  // Error message
  if (connectionStatus === 'error') {
    return (
      <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
        <AlertTriangle size={16} className="text-red-600 mt-0.5" />
        <div>
          <p className="text-sm text-red-800 font-medium">
            Failed to connect to Qboid device
          </p>
          <p className="text-xs text-red-700 mt-1">
            Please check your connection and try again. Make sure your device is properly configured.
          </p>
        </div>
      </div>
    );
  }
  
  // Connecting message
  if (connectionStatus === 'connecting') {
    return (
      <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
        <Info size={16} className="text-amber-600 mt-0.5" />
        <div>
          <p className="text-sm text-amber-800 font-medium">
            Awaiting data from Qboid device
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Please place a package on the device. Make sure the device is properly configured with the correct API endpoint.
          </p>
        </div>
      </div>
    );
  }
  
  // Order ID specific message
  if (connectionStatus === 'connected' && form.getValues("orderId")) {
    return (
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-2">
        <CheckCircle2 size={16} className="text-blue-600 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800 font-medium">
            Package data populated from Qboid scanner
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Order #{form.getValues("orderId")}
            {lastUpdateTime && <span className="ml-2">(Last updated: {lastUpdateTime})</span>}
          </p>
        </div>
      </div>
    );
  }
  
  // Connected but no order ID message
  if (connectionStatus === 'connected') {
    return (
      <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-2">
        <CheckCircle2 size={16} className="text-green-600 mt-0.5" />
        <div>
          <p className="text-sm text-green-800 font-medium">
            Package dimensions received from Qboid
          </p>
          <p className="text-xs text-green-700 mt-1">
            Dimensions and weight automatically populated at {lastUpdateTime}
          </p>
        </div>
      </div>
    );
  }
  
  return null;
};

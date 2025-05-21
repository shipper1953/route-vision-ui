
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";
import { ConnectionStatus } from "./useQboidConnection";

interface PackageStatusMessageProps {
  connectionStatus: ConnectionStatus;
  lastUpdateTime: string | null;
}

export const PackageStatusMessage = ({ connectionStatus, lastUpdateTime }: PackageStatusMessageProps) => {
  const form = useFormContext<ShipmentForm>();
  
  // No message if no update time or not needed
  if (!lastUpdateTime) return null;
  
  // Error message
  if (connectionStatus === 'error') {
    return (
      <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-800">
          Failed to connect to Qboid device. Please check your connection and try again.
        </p>
      </div>
    );
  }
  
  // Order ID specific message
  if (form.getValues("orderId")) {
    return (
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          Package data populated from Qboid scanning system for order #{form.getValues("orderId")}
          {lastUpdateTime && <span className="ml-2 text-xs text-slate-500">(Last updated: {lastUpdateTime})</span>}
        </p>
      </div>
    );
  }
  
  // Connected but no order ID message
  if (connectionStatus === 'connected') {
    return (
      <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-md">
        <p className="text-sm text-green-800">
          Package dimensions received from Qboid at {lastUpdateTime}
        </p>
      </div>
    );
  }
  
  return null;
};

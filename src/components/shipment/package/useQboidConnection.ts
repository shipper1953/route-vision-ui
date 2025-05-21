
import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";
import { listenForQboidData } from "@/services/easypost";
import { toast } from "sonner";

export const useQboidConnection = () => {
  const form = useFormContext<ShipmentForm>();
  const [configuring, setConfiguring] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  
  const handleConfigureQboid = async () => {
    try {
      setConfiguring(true);
      setConnectionStatus('connecting');
      
      // Get the configuration info - await the Promise
      const qboidInfo = await listenForQboidData((dimensions) => {
        // This callback would be called when new dimensions are received
        console.log("Received dimensions from Qboid:", dimensions);
        form.setValue("length", dimensions.length);
        form.setValue("width", dimensions.width);
        form.setValue("height", dimensions.height);
        form.setValue("weight", dimensions.weight);
        
        if (dimensions.orderId) {
          form.setValue("orderId", dimensions.orderId);
        }
        
        setConnectionStatus('connected');
        setLastUpdateTime(new Date().toLocaleTimeString());
        toast.success("Package dimensions updated from Qboid scanner");
      });
      
      // Now we can safely access endpointUrl since we've awaited the Promise
      toast.info("Qboid Integration Info", {
        description: (
          <div className="mt-2 text-sm">
            <p className="font-semibold">Configure your Qboid with this endpoint:</p>
            <p className="mt-1 font-mono text-xs bg-slate-100 p-2 rounded overflow-auto">
              {qboidInfo.endpointUrl}
            </p>
            <p className="mt-2">Use POST method with JSON body containing:</p>
            <p className="mt-1 font-mono text-xs bg-slate-100 p-2 rounded overflow-auto">
              {`{ "length": 12, "width": 8, "height": 6, "weight": 32 }`}
            </p>
            <p className="mt-2 text-blue-600">
              Make sure your Qboid device is on the same network as this computer.
            </p>
          </div>
        ),
        duration: 0, // Keep it visible until dismissed
      });
    } catch (error) {
      console.error("Error configuring Qboid:", error);
      toast.error("Failed to configure Qboid integration");
      setConnectionStatus('disconnected');
    } finally {
      setConfiguring(false);
    }
  };
  
  // Reset connection status when unmounting
  useEffect(() => {
    return () => {
      setConnectionStatus('disconnected');
    };
  }, []);

  return {
    configuring,
    connectionStatus,
    lastUpdateTime,
    handleConfigureQboid
  };
};

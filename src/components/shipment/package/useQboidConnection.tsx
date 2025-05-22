
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";
import { listenForQboidData } from "@/services/easypost";

export type ConnectionStatus = "disconnected" | "connected" | "connecting" | "error";

export function useQboidConnection() {
  const [configuring, setConfiguring] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [deviceIp, setDeviceIp] = useState<string>("");
  const [configGuide, setConfigGuide] = useState<any>(null);
  
  // Get the form context to update form values
  const form = useFormContext<ShipmentForm>();
  
  // Store device configuration in ref to persist between renders
  const configRef = useRef<any>(null);
  
  // Setup real-time listener for Qboid data
  useEffect(() => {
    const setupRealtimeListener = async () => {
      // Subscribe to the Qboid events table for real-time updates
      const channel = supabase
        .channel('qboid-events')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'qboid_events' },
          (payload) => {
            console.log('Received qboid event:', payload);
            
            // Extract the dimensions data
            if (payload.new && payload.new.data && payload.new.data.dimensions) {
              const { dimensions, orderId } = payload.new.data;
              
              // Update form with dimensions
              if (form) {
                form.setValue("length", dimensions.length, { shouldValidate: true });
                form.setValue("width", dimensions.width, { shouldValidate: true });
                form.setValue("height", dimensions.height, { shouldValidate: true });
                form.setValue("weight", dimensions.weight, { shouldValidate: true });
                
                // If orderId is provided and form has orderId field, update it
                if (orderId && form.getValues("orderId") === "") {
                  form.setValue("orderId", orderId, { shouldValidate: true });
                }
                
                // Update connection status and timestamp
                setConnectionStatus("connected");
                setLastUpdateTime(new Date().toLocaleTimeString());
                
                // Show success message
                toast.success("Package dimensions received from Qboid");
              }
            }
          }
        )
        .subscribe();
        
      // Cleanup function
      return () => {
        supabase.removeChannel(channel);
      };
    };
    
    if (connectionStatus === "connecting") {
      setupRealtimeListener();
    }
    
    return () => {
      // This will be called when the component unmounts
    };
  }, [connectionStatus, form]);
  
  // Handle IP address change for device configuration
  const handleDeviceIpChange = (ip: string) => {
    setDeviceIp(ip);
  };
  
  // Configure Qboid WiFi API connection
  const handleConfigureQboid = async () => {
    try {
      setConfiguring(true);
      setConnectionStatus("connecting");
      console.log("Configuring Qboid device...");
      
      // Call the service to get configuration information
      const qboidConfig = await listenForQboidData((dimensions) => {
        console.log("Received dimensions from Qboid:", dimensions);
        
        // Update form with dimensions
        if (form) {
          form.setValue("length", dimensions.length, { shouldValidate: true });
          form.setValue("width", dimensions.width, { shouldValidate: true });
          form.setValue("height", dimensions.height, { shouldValidate: true });
          form.setValue("weight", dimensions.weight, { shouldValidate: true });
          
          // If orderId is provided and form has orderId field, update it
          if (dimensions.orderId && form.getValues("orderId") === "") {
            form.setValue("orderId", dimensions.orderId, { shouldValidate: true });
          }
          
          // Update connection status and timestamp
          setConnectionStatus("connected");
          setLastUpdateTime(new Date().toLocaleTimeString());
          
          // Show success message
          toast.success("Package dimensions received from Qboid");
        }
      });
      
      // Store configuration information
      configRef.current = qboidConfig;
      
      // Generate configuration guide based on provided IP or discovery URL
      const guide = qboidConfig.configureScanner(deviceIp || undefined);
      setConfigGuide(guide);
      
      // Show toast with configuration instructions
      toast.info("Please configure your Qboid device with the provided settings");
      
      // Simulate successful connection for demo purposes
      setTimeout(() => {
        if (connectionStatus !== "connected") {
          setConnectionStatus("connecting");
          toast.info("Waiting for Qboid device to send dimensions...");
        }
      }, 3000);
      
    } catch (error) {
      console.error("Error configuring Qboid:", error);
      setConnectionStatus("error");
      toast.error("Failed to connect to Qboid device");
    } finally {
      setConfiguring(false);
    }
  };
  
  // Clean up connection when component unmounts
  useEffect(() => {
    return () => {
      console.log("Disconnecting Qboid...");
      setConnectionStatus("disconnected");
    };
  }, []);
  
  return {
    configuring,
    connectionStatus,
    lastUpdateTime,
    deviceIp,
    configGuide,
    handleDeviceIpChange,
    handleConfigureQboid
  };
}

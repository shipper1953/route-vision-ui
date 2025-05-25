
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";

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
      console.log("Setting up Qboid realtime listener");
      
      try {
        // Subscribe to the qboid_events table for real-time updates
        const channel = supabase
          .channel('qboid-events')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'qboid_events' },
            (payload) => {
              console.log('Received qboid event:', payload);
              
              // Extract the dimensions data from the event
              if (payload.new && payload.new.data) {
                const eventData = payload.new.data as any;
                const { dimensions, orderId } = eventData;
                
                if (dimensions && form) {
                  // Update form with dimensions
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
          .subscribe(async (status) => {
            console.log('Supabase realtime status:', status);
            if (status === 'SUBSCRIBED') {
              console.log("Successfully subscribed to qboid_events table");
            } else if (status === 'CHANNEL_ERROR') {
              console.error("Error subscribing to qboid_events table");
              setConnectionStatus("error");
              toast.error("Could not connect to Qboid realtime updates");
            }
          });
          
        // Cleanup function
        return () => {
          console.log("Cleaning up Qboid realtime listener");
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error("Error setting up realtime listener:", error);
        setConnectionStatus("error");
        toast.error("Failed to set up Qboid connection");
      }
    };
    
    if (connectionStatus === "connecting") {
      setupRealtimeListener();
    }
    
    return () => {
      // This will be called when the component unmounts
      console.log("Cleaning up Qboid connection");
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
      
      // Generate configuration guide for the device
      const apiEndpoint = `https://gidrlosmhpvdcogrkidj.supabase.co/functions/v1/qboid-wifi-api-handler`;
      
      const guide = {
        apiEndpoint,
        instructions: [
          "1. Connect to your Qboid device's WiFi configuration interface",
          "2. Set the API endpoint URL to: " + apiEndpoint,
          "3. Configure the device to send POST requests with dimension data",
          "4. Test the connection by placing a package on the device"
        ],
        testUrl: apiEndpoint,
        expectedFormat: {
          timestamp: "2025/01/25 12:00:00",
          l: 203,
          w: 203, 
          h: 203,
          weight: 3629,
          barcode: "ORD-1234",
          device: "FH0402281500417"
        }
      };
      
      setConfigGuide(guide);
      
      // Show toast with configuration instructions
      toast.info("Configure your Qboid device with the provided endpoint URL");
      
      // The connection status will change to "connected" when we receive data
      toast.info("Waiting for Qboid device to send dimensions...");
      
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

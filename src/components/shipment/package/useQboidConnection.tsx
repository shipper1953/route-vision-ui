
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFormContext } from "react-hook-form";
import { ShipmentForm } from "@/types/shipment";

export type ConnectionStatus = "disconnected" | "connected" | "error";

export function useQboidConnection() {
  const [configuring, setConfiguring] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  // Get the form context to update form values
  const form = useFormContext<ShipmentForm>();
  
  // Simulate the Qboid connection
  const handleConfigureQboid = async () => {
    try {
      setConfiguring(true);
      console.log("Configuring Qboid device...");
      
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful connection
      setConnectionStatus("connected");
      setLastUpdateTime(new Date());
      
      // Simulate getting data from the device
      const dimensions = {
        length: 12,
        width: 8,
        height: 6,
        weight: 2.5
      };
      
      // Update form with dimensions
      form.setValue("length", dimensions.length);
      form.setValue("width", dimensions.width);
      form.setValue("height", dimensions.height);
      form.setValue("weight", dimensions.weight);
      
      // Save measurements to Supabase if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { error } = await supabase
          .from('shipments')
          .insert({
            dimensions: dimensions,
            weight: dimensions.weight,
            created_at: new Date().toISOString(),
            status: 'dimensions_captured'
          });
        
        if (error) {
          console.error("Error saving dimensions to Supabase:", error);
          toast.error("Failed to save package dimensions to your account");
        } else {
          toast.success("Package dimensions saved to your account");
        }
      } else {
        // If not authenticated, just show toast without saving to database
        console.log("User not authenticated, skipping database save");
        toast.info("Package dimensions captured. Create an account to save for later.");
      }
      
      toast.success("Qboid device connected successfully");
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
    };
  }, []);
  
  return {
    configuring,
    connectionStatus,
    lastUpdateTime,
    handleConfigureQboid
  };
}

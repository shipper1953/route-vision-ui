
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarProvider } from "@/context/SidebarContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AppRoutes from "./router";

// Create a new QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

const App = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Test Supabase connection
    const checkSupabaseConnection = async () => {
      try {
        // Test Supabase Edge Function connectivity
        const testCall = async () => {
          try {
            console.log("Testing Supabase Edge Function connectivity...");
            const { data, error } = await supabase.functions.invoke('address-lookup', {
              body: { query: "test" }
            });
            
            if (error) {
              console.error("Supabase Edge Function test error:", error);
              toast.error("Failed to connect to address lookup service");
            } else {
              console.log("Supabase Edge Function test successful:", data);
              console.log("Supabase connection successful");
            }
          } catch (err) {
            console.error("Error testing Supabase Edge Function:", err);
            toast.error("Error connecting to Supabase Edge Functions");
          }
        };
        
        await testCall();
        
        // Set ready to not block app rendering
        setReady(true);
      } catch (err) {
        console.error("Error checking Supabase connection:", err);
        toast.error("Failed to connect to Supabase");
        setReady(true);
      }
    };

    checkSupabaseConnection();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider>
          <Toaster />
          <Sonner position="top-right" />
          <AppRoutes />
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

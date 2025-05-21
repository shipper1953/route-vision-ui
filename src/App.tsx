
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarProvider } from "@/context/SidebarContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppRoutes from "./router";

const queryClient = new QueryClient();

const App = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Test Supabase connection
    const checkSupabaseConnection = async () => {
      try {
        // Test Supabase Edge Functions
        const testCall = async () => {
          try {
            console.log("Testing Supabase Edge Function connectivity...");
            const { data, error } = await supabase.functions.invoke('address-lookup', {
              body: { query: "test" }
            });
            
            if (error) {
              console.error("Supabase Edge Function test error:", error);
            } else {
              console.log("Supabase Edge Function test successful:", data);
            }
          } catch (err) {
            console.error("Error testing Supabase Edge Function:", err);
          }
        };
        
        await testCall();
        
        // Set ready regardless of result to not block app rendering
        setReady(true);
      } catch (err) {
        console.error("Error checking Supabase connection:", err);
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
          <Sonner />
          <AppRoutes />
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

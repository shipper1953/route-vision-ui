import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarProvider } from "@/context/SidebarContext";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@supabase/supabase-js"; // Adjust the import based on your Supabase client setup

// Create AuthContext
const AuthContext = createContext();

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = supabase.auth.session();
    setUser(session?.user ?? null);
    setLoading(false);

    const { data: subscription } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the Auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

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
  return (
    <AuthProvider>  {/* Wrap your application with AuthProvider */}
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SidebarProvider>
            <Toaster />
            <Sonner position="top-right" />
            <RouterProvider router={router} />
          </SidebarProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
};

export default App;

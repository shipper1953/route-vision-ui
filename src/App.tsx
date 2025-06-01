import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarProvider } from "@/context/SidebarContext";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { AuthProvider } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase"; // make sure this path is correct

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
  const [todos, setTodos] = useState<any[]>([]);

  useEffect(() => {
    const getTodos = async () => {
      const { data, error } = await supabase.from("todos").select();

      if (error) {
        console.error("Error fetching todos:", error);
        return;
      }

      if (data && data.length > 0) {
        setTodos(data);
      }
    };

    getTodos();
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SidebarProvider>
            <Toaster />
            <Sonner position="top-right" />
            <RouterProvider router={router} />

            {/* Debug display for fetched todos */}
            <div className="p-4">
              <h2 className="text-lg font-bold">Fetched Todos:</h2>
              <ul className="list-disc pl-5">
                {todos.map((todo, index) => (
                  <li key={index}>{JSON.stringify(todo)}</li>
                ))}
              </ul>
            </div>

          </SidebarProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
};

export default App;

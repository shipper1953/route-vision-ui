
import { createBrowserRouter, Navigate } from "react-router-dom";
import Index from "@/pages/Index";
import Orders from "@/pages/Orders";
import EditOrder from "@/pages/EditOrder";
import CreateOrder from "@/pages/CreateOrder";
import Shipments from "@/pages/Shipments";
import CreateShipment from "@/pages/CreateShipment";
import Settings from "@/pages/Settings";
import Users from "@/pages/Users";
import CreateUser from "@/pages/CreateUser";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import { useAuth } from "@/context/AuthContext";
import React from "react";

// Helper for protected routes
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  
  // For now, let's bypass authentication to see if pages load
  // if (loading) return <div>Loading...</div>;
  // return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
  
  // Temporarily bypass authentication
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Index />
      </ProtectedRoute>
    ),
  },
  {
    path: "/orders",
    element: (
      <ProtectedRoute>
        <Orders />
      </ProtectedRoute>
    ),
  },
  {
    path: "/edit-order/:orderId",
    element: (
      <ProtectedRoute>
        <EditOrder />
      </ProtectedRoute>
    ),
  },
  {
    path: "/create-order",
    element: (
      <ProtectedRoute>
        <CreateOrder />
      </ProtectedRoute>
    ),
  },
  {
    path: "/shipments",
    element: (
      <ProtectedRoute>
        <Shipments />
      </ProtectedRoute>
    ),
  },
  {
    path: "/create-shipment",
    element: (
      <ProtectedRoute>
        <CreateShipment />
      </ProtectedRoute>
    ),
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    ),
  },
  {
    path: "/users",
    element: (
      <ProtectedRoute>
        <Users />
      </ProtectedRoute>
    ),
  },
  {
    path: "/create-user",
    element: (
      <ProtectedRoute>
        <CreateUser />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

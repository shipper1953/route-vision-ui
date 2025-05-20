
import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AdminRouteProps {
  allowedRoles: string[];
  children: ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  const hasRequiredRole = user?.roles.some(role => allowedRoles.includes(role));
  
  if (isAuthenticated && hasRequiredRole) {
    return <>{children}</>;
  }
  
  return isAuthenticated ? <Navigate to="/unauthorized" replace /> : <Navigate to="/login" replace />;
};

export default AdminRoute;

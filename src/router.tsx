
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoadingPage } from './components/transitions/LoadingPage';
import { AuthProvider, useAuth } from './context/AuthContext';

// Import components directly instead of using lazy loading since that's causing type errors
import Index from './pages/Index';
import Orders from './pages/Orders';
import Shipments from './pages/Shipments';
import CreateShipment from './pages/CreateShipment';
import CreateOrder from './pages/CreateOrder';
import Users from './pages/Users';
import CreateUser from './pages/CreateUser';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

// Create login page component
const Login = lazy(() => import('./pages/Login'));

// Protected route component
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingPage />;
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// Admin route component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  
  if (loading) {
    return <LoadingPage />;
  }
  
  return isAuthenticated && isAdmin ? <>{children}</> : <Navigate to="/" />;
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingPage />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Index /></PrivateRoute>} />
            <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
            <Route path="/create-order" element={<PrivateRoute><CreateOrder /></PrivateRoute>} />
            <Route path="/shipments" element={<PrivateRoute><Shipments /></PrivateRoute>} />
            <Route path="/create-shipment" element={<PrivateRoute><CreateShipment /></PrivateRoute>} />
            <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
            <Route path="/create-user" element={<AdminRoute><CreateUser /></AdminRoute>} />
            <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
            <Route path="/loading" element={<LoadingPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;

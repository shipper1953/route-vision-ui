
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoadingPage } from './components/transitions/LoadingPage';
import { AuthProvider, useAuth } from './context/AuthContext';

// Import components directly instead of using lazy loading since that's causing type errors
import Index from './pages/Index';
import Orders from './pages/Orders';
import Shipments from './pages/Shipments';
import CreateShipment from './pages/CreateShipment';
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

// Create mock API route handler component for development
const ApiHandler = () => {
  const apiPath = window.location.pathname.replace('/api/', '');
  
  // Handle the create-shipment API route
  if (apiPath === 'create-shipment') {
    return (
      <div className="p-4">
        <h1>Create Shipment API</h1>
        <p>This is a mock API endpoint for creating shipments. In production, this would be handled by a Supabase Edge Function.</p>
        <script dangerouslySetInnerHTML={{
          __html: `
            const mockResponse = {
              id: "shp_" + Math.random().toString(36).substring(2, 15),
              object: "Shipment",
              status: "created",
              smartrates: [
                {
                  id: "rate_" + Math.random().toString(36).substring(2, 15),
                  carrier: "USPS",
                  service: "Priority",
                  rate: "13.65",
                  delivery_days: 2,
                  delivery_date: new Date(Date.now() + 2*24*60*60*1000).toISOString(),
                  delivery_accuracy: "percentile_95",
                  delivery_date_guaranteed: true,
                  time_in_transit: 2
                },
                {
                  id: "rate_" + Math.random().toString(36).substring(2, 15),
                  carrier: "UPS",
                  service: "Ground",
                  rate: "15.20",
                  delivery_days: 3,
                  delivery_date: new Date(Date.now() + 3*24*60*60*1000).toISOString(),
                  delivery_accuracy: "percentile_90",
                  delivery_date_guaranteed: true,
                  time_in_transit: 3
                },
                {
                  id: "rate_" + Math.random().toString(36).substring(2, 15),
                  carrier: "FedEx",
                  service: "2Day",
                  rate: "24.50",
                  delivery_days: 2,
                  delivery_date: new Date(Date.now() + 2*24*60*60*1000).toISOString(),
                  delivery_accuracy: "percentile_90",
                  delivery_date_guaranteed: true,
                  time_in_transit: 2
                }
              ],
              rates: [],
              selected_rate: null
            };
            
            // Send the mock response
            window.parent.postMessage({
              type: 'apiResponse',
              status: 200,
              data: mockResponse
            }, '*');
          `
        }} />
      </div>
    );
  }
  
  // Handle the purchase-label API route
  if (apiPath === 'purchase-label') {
    return (
      <div className="p-4">
        <h1>Purchase Label API</h1>
        <p>This is a mock API endpoint for purchasing shipping labels. In production, this would be handled by a Supabase Edge Function.</p>
        <script dangerouslySetInnerHTML={{
          __html: `
            const mockResponse = {
              id: "shp_" + Math.random().toString(36).substring(2, 15),
              postage_label: {
                url: "https://example.com/label.pdf"
              },
              tracking_code: "9400111202" + Math.floor(Math.random() * 100000000),
              status: "purchased"
            };
            
            // Send the mock response
            window.parent.postMessage({
              type: 'apiResponse',
              status: 200,
              data: mockResponse
            }, '*');
          `
        }} />
      </div>
    );
  }
  
  return <NotFound />;
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
            <Route path="/shipments" element={<PrivateRoute><Shipments /></PrivateRoute>} />
            <Route path="/create-shipment" element={<PrivateRoute><CreateShipment /></PrivateRoute>} />
            <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
            <Route path="/create-user" element={<AdminRoute><CreateUser /></AdminRoute>} />
            <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
            <Route path="/loading" element={<LoadingPage />} />
            <Route path="/api/*" element={<ApiHandler />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;

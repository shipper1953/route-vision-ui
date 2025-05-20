
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import Layout from './components/Layout';
import AuthLayout from './components/AuthLayout';
import DashboardLayout from './components/DashboardLayout';

// Route Protection
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

// Loading
import { LoadingPage } from './components/transitions/LoadingPage';

// Pages
const NotFound = lazy(() => import('./pages/NotFound'));
const Index = lazy(() => import('./pages/Index'));
const Orders = lazy(() => import('./pages/Orders'));
const Shipments = lazy(() => import('./pages/Shipments'));
const CreateShipment = lazy(() => import('./pages/CreateShipment'));
const Users = lazy(() => import('./pages/Users'));
const CreateUser = lazy(() => import('./pages/CreateUser'));
const Settings = lazy(() => import('./pages/Settings'));

// For pages that don't exist yet, we'll use a placeholder component
const PlaceholderPage = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">Page Under Construction</h1>
      <p>This page is coming soon.</p>
    </div>
  </div>
);

const LoginPage = lazy(() => PlaceholderPage);
const RegisterPage = lazy(() => PlaceholderPage);
const ProfilePage = lazy(() => PlaceholderPage);
const UnauthorizedPage = lazy(() => PlaceholderPage);

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        {/* Public routes */}
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
        </Route>
        
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        
        {/* Protected routes */}
        <Route element={<PrivateRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Index />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/shipments" element={<Shipments />} />
            <Route path="/create-shipment" element={<CreateShipment />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<ProfilePage />} />
            
            {/* Admin routes */}
            <Route path="/admin/users" element={
              <AdminRoute allowedRoles={['Super Admin', 'Company Admin']}>
                <Users />
              </AdminRoute>
            } />
            <Route path="/admin/create-user" element={
              <AdminRoute allowedRoles={['Super Admin', 'Company Admin']}>
                <CreateUser />
              </AdminRoute>
            } />
            
            {/* 404 page for authenticated users */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;

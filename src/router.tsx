
import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
} from "react-router-dom";
import { Loader2 } from "lucide-react";

// Eager load critical pages (landing, auth, orders)
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Orders from "@/pages/Orders";
import PrivacyPolicy from "@/pages/PrivacyPolicy";

// Lazy load all other pages for code splitting
const TrackOrder = lazy(() => import("@/pages/TrackOrder"));
const DeliveryPreferences = lazy(() => import("@/pages/DeliveryPreferences"));
const CreateOrder = lazy(() => import("@/pages/CreateOrder"));
const EditOrder = lazy(() => import("@/pages/EditOrder"));
const OrderDetails = lazy(() => import("@/pages/OrderDetails"));
const BulkShipOrders = lazy(() => import("@/pages/BulkShipOrders"));
const Shipments = lazy(() => import("@/pages/Shipments"));
const CreateShipment = lazy(() => import("@/pages/CreateShipment"));
const ItemMaster = lazy(() => import("@/pages/ItemMaster"));
const Users = lazy(() => import("@/pages/Users"));
const CreateUser = lazy(() => import("@/pages/CreateUser"));
const Settings = lazy(() => import("@/pages/Settings"));
const ProfileSettings = lazy(() => import("@/pages/ProfileSettings"));
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));
const SuperAdminPanel = lazy(() => import("@/pages/SuperAdminPanel"));
const CompanyAdminPanel = lazy(() => import("@/pages/CompanyAdminPanel"));
const GenerateDemoOrders = lazy(() => import("@/pages/GenerateDemoOrders"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// WMS pages
const WmsDashboard = lazy(() => import("@/pages/wms/Dashboard"));
const WmsReceiving = lazy(() => import("@/pages/wms/Receiving"));
const WmsQuality = lazy(() => import("@/pages/wms/Quality"));
const WmsInventory = lazy(() => import("@/pages/wms/Inventory"));
const WmsPicking = lazy(() => import("@/pages/wms/Picking"));
const WmsReporting = lazy(() => import("@/pages/wms/Reporting"));

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Wrapper component to add Suspense to lazy-loaded routes
const LazyRoute = ({ Component }: { Component: React.LazyExoticComponent<() => JSX.Element> }) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/login",
    element: <Login />,
  },
    {
      path: "/signup",
      element: <Signup />,
    },
    {
      path: "/privacy",
      element: <PrivacyPolicy />,
    },
    {
      path: "/track/:trackingNumber",
      element: <LazyRoute Component={TrackOrder} />,
    },
    {
      path: "/track",
      element: <LazyRoute Component={TrackOrder} />,
    },
    {
      path: "/delivery-preferences",
      element: <LazyRoute Component={DeliveryPreferences} />,
    },
    {
      path: "/orders",
      element: <Orders />,
    },
  {
    path: "/orders/create",
    element: <LazyRoute Component={CreateOrder} />,
  },
  {
    path: "/orders/:id",
    element: <LazyRoute Component={OrderDetails} />,
  },
  {
    path: "/orders/:id/edit",
    element: <LazyRoute Component={EditOrder} />,
  },
  {
    path: "/orders/bulk-ship",
    element: <LazyRoute Component={BulkShipOrders} />,
  },
  {
    path: "/shipments",
    element: <LazyRoute Component={Shipments} />,
  },
  {
    path: "/shipments/create",
    element: <LazyRoute Component={CreateShipment} />,
  },
    {
      path: "/item-master",
      element: <LazyRoute Component={ItemMaster} />,
    },
    {
      path: "/item-master/create",
      element: <LazyRoute Component={ItemMaster} />,
    },
  {
    path: "/users",
    element: <LazyRoute Component={Users} />,
  },
  {
    path: "/users/create",
    element: <LazyRoute Component={CreateUser} />,
  },
  {
    path: "/packaging",
    element: <LazyRoute Component={Settings} />,
  },
  {
    path: "/settings",
    element: <LazyRoute Component={ProfileSettings} />,
  },
  {
    path: "/admin",
    element: <LazyRoute Component={AdminPanel} />,
  },
  {
    path: "/super-admin",
    element: <LazyRoute Component={SuperAdminPanel} />,
  },
  {
    path: "/company-admin",
    element: <LazyRoute Component={CompanyAdminPanel} />,
  },
  {
    path: "/generate-demo-orders",
    element: <LazyRoute Component={GenerateDemoOrders} />,
  },
  {
    path: "/onboarding",
    element: <LazyRoute Component={Onboarding} />,
  },
  {
    path: "/wms/dashboard",
    element: <LazyRoute Component={WmsDashboard} />,
  },
  {
    path: "/wms/receiving",
    element: <LazyRoute Component={WmsReceiving} />,
  },
  {
    path: "/wms/quality",
    element: <LazyRoute Component={WmsQuality} />,
  },
  {
    path: "/wms/inventory",
    element: <LazyRoute Component={WmsInventory} />,
  },
  {
    path: "/wms/picking",
    element: <LazyRoute Component={WmsPicking} />,
  },
  {
    path: "/wms/reporting",
    element: <LazyRoute Component={WmsReporting} />,
  },
  {
    path: "*",
    element: <LazyRoute Component={NotFound} />,
  },
]);

export default router;

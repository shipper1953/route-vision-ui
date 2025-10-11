
import {
  createBrowserRouter,
} from "react-router-dom";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Orders from "@/pages/Orders";
import CreateOrder from "@/pages/CreateOrder";
import EditOrder from "@/pages/EditOrder";
import OrderDetails from "@/pages/OrderDetails";
import BulkShipOrders from "@/pages/BulkShipOrders";
import Shipments from "@/pages/Shipments";
import CreateShipment from "@/pages/CreateShipment";
import ItemMaster from "@/pages/ItemMaster";
import Users from "@/pages/Users";
import CreateUser from "@/pages/CreateUser";
import Settings from "@/pages/Settings";
import ProfileSettings from "@/pages/ProfileSettings";
import AdminPanel from "@/pages/AdminPanel";
import SuperAdminPanel from "@/pages/SuperAdminPanel";
import CompanyAdminPanel from "@/pages/CompanyAdminPanel";
import NotFound from "@/pages/NotFound";

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
    path: "/orders",
    element: <Orders />,
  },
  {
    path: "/orders/create",
    element: <CreateOrder />,
  },
  {
    path: "/orders/:id",
    element: <OrderDetails />,
  },
  {
    path: "/orders/:id/edit",
    element: <EditOrder />,
  },
  {
    path: "/orders/bulk-ship",
    element: <BulkShipOrders />,
  },
  {
    path: "/shipments",
    element: <Shipments />,
  },
  {
    path: "/shipments/create",
    element: <CreateShipment />,
  },
  {
    path: "/item-master",
    element: <ItemMaster />,
  },
  {
    path: "/users",
    element: <Users />,
  },
  {
    path: "/users/create",
    element: <CreateUser />,
  },
  {
    path: "/packaging",
    element: <Settings />,
  },
  {
    path: "/settings",
    element: <ProfileSettings />,
  },
  {
    path: "/admin",
    element: <AdminPanel />,
  },
  {
    path: "/super-admin",
    element: <SuperAdminPanel />,
  },
  {
    path: "/company-admin",
    element: <CompanyAdminPanel />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;


import { createBrowserRouter } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Orders from "./pages/Orders";
import CreateOrder from "./pages/CreateOrder";
import EditOrder from "./pages/EditOrder";
import Shipments from "./pages/Shipments";
import CreateShipment from "./pages/CreateShipment";
import Settings from "./pages/Settings";
import AdminPanel from "./pages/AdminPanel";
import SuperAdminPanel from "./pages/SuperAdminPanel";
import CompanyAdminPanel from "./pages/CompanyAdminPanel";
import CreateUser from "./pages/CreateUser";
import Users from "./pages/Users";
import NotFound from "./pages/NotFound";

export const router = createBrowserRouter([
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
    path: "/orders/new",
    element: <CreateOrder />,
  },
  {
    path: "/orders/:id/edit",
    element: <EditOrder />,
  },
  {
    path: "/shipments",
    element: <Shipments />,
  },
  {
    path: "/shipments/new",
    element: <CreateShipment />,
  },
  {
    path: "/settings",
    element: <Settings />,
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
    path: "/users/new",
    element: <CreateUser />,
  },
  {
    path: "/users",
    element: <Users />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

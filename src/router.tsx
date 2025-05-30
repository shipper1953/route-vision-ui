
import { createBrowserRouter } from "react-router-dom";
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

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/orders",
    element: <Orders />,
  },
  {
    path: "/edit-order/:orderId",
    element: <EditOrder />,
  },
  {
    path: "/create-order",
    element: <CreateOrder />,
  },
  {
    path: "/shipments",
    element: <Shipments />,
  },
  {
    path: "/create-shipment",
    element: <CreateShipment />,
  },
  {
    path: "/settings",
    element: <Settings />,
  },
  {
    path: "/users",
    element: <Users />,
  },
  {
    path: "/create-user",
    element: <CreateUser />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

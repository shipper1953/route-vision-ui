
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
import Users from "./pages/Users";
import CreateUser from "./pages/CreateUser";
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
    path: "/users",
    element: <Users />,
  },
  {
    path: "/create-user",
    element: <CreateUser />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);


import { Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const DashboardHeader = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your transportation management system
        </p>
      </div>
      <div className="mt-4 md:mt-0 flex gap-3">
        <Button className="bg-tms-blue hover:bg-tms-blue-400" onClick={() => navigate('/orders/new')}>
          <Package className="mr-2 h-4 w-4" />
          Create Order
        </Button>
        <Button className="bg-tms-teal hover:bg-tms-teal/80" onClick={() => navigate('/shipments/new')}>
          <Truck className="mr-2 h-4 w-4" />
          Create Shipment
        </Button>
      </div>
    </div>
  );
};

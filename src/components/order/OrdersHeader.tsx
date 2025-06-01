
import { FileDown, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const OrdersHeader = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-tms-blue">Orders</h1>
        <p className="text-muted-foreground">Manage your customer orders</p>
      </div>
      <div className="mt-4 md:mt-0 flex gap-3">
        <Button className="bg-tms-blue hover:bg-tms-blue-400" onClick={() => navigate('/orders/new')}>
          <ShoppingBag className="mr-2 h-4 w-4" />
          Create Order
        </Button>
        <Button variant="outline" onClick={() => {}}>
          <FileDown className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>
    </div>
  );
};

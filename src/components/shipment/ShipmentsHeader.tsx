
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const ShipmentsHeader = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-tms-blue">Parcel Shipments</h1>
        <p className="text-muted-foreground">Track and manage your EasyPost shipments</p>
      </div>
      <div className="mt-4 md:mt-0 flex gap-3">
        <Button 
          className="bg-tms-blue hover:bg-tms-blue-400"
          onClick={() => navigate('/create-shipment')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Shipment
        </Button>
      </div>
    </div>
  );
};

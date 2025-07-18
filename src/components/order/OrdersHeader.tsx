
import { FileDown, ShoppingBag, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const OrdersHeader = () => {
  const navigate = useNavigate();
  const [isSync, setIsSync] = useState(false);

  const handleSyncDeliveryDates = async () => {
    setIsSync(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-delivery-dates');
      
      if (error) {
        console.error('Sync error:', error);
        toast.error('Failed to sync delivery dates');
      } else {
        console.log('Sync result:', data);
        toast.success(`Updated ${data?.updates?.length || 0} shipments with delivery dates`);
        // Refresh the page to show updated data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error calling sync function:', error);
      toast.error('Failed to sync delivery dates');
    } finally {
      setIsSync(false);
    }
  };
  
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-tms-blue">Orders</h1>
        <p className="text-muted-foreground">Manage your customer orders</p>
      </div>
      <div className="mt-4 md:mt-0 flex gap-3">
        <Button
          onClick={handleSyncDeliveryDates}
          disabled={isSync}
          variant="outline"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isSync ? 'animate-spin' : ''}`} />
          Sync Delivery Dates
        </Button>
        <Button className="bg-tms-blue hover:bg-tms-blue-400" onClick={() => navigate('/orders/create')}>
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

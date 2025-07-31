import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Box, Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OrderCartonization {
  id: string;
  recommended_box_data: any;
  utilization: number;
  confidence: number;
  total_weight: number;
  items_weight: number;
  box_weight: number;
}

interface OrderTableRowCartonizationProps {
  orderId: string;
}

export const OrderTableRowCartonization = ({ orderId }: OrderTableRowCartonizationProps) => {
  const [cartonization, setCartonization] = useState<OrderCartonization | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const fetchCartonization = async () => {
    try {
      const { data, error } = await supabase
        .from('order_cartonization')
        .select('*')
        .eq('order_id', parseInt(orderId))
        .maybeSingle();

      if (error) {
        console.error('Error fetching cartonization:', error);
        return;
      }

      setCartonization(data);
    } catch (error) {
      console.error('Error fetching cartonization:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const { error } = await supabase.functions.invoke('recalculate-cartonization', {
        body: { orderIds: [parseInt(orderId)] }
      });

      if (error) {
        console.error('Error recalculating cartonization:', error);
      } else {
        // Refetch the data after recalculation
        await fetchCartonization();
      }
    } catch (error) {
      console.error('Error recalculating cartonization:', error);
    } finally {
      setRecalculating(false);
    }
  };

  useEffect(() => {
    fetchCartonization();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!cartonization) {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleRecalculate}
          disabled={recalculating}
        >
          <Box className={`h-4 w-4 mr-1 ${recalculating ? 'animate-spin' : ''}`} />
          Calculate
        </Button>
      </div>
    );
  }

  const box = cartonization.recommended_box_data;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {box?.name || 'Unknown Box'}
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRecalculate}
          disabled={recalculating}
          className="h-6 px-2"
        >
          <Box className={`h-3 w-3 ${recalculating ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5">
        <div>Utilization: {cartonization.utilization?.toFixed(1)}%</div>
        <div>Weight: {cartonization.total_weight?.toFixed(1)} lbs</div>
        <div>Confidence: {cartonization.confidence}%</div>
      </div>
    </div>
  );
};
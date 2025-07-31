import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const CartonizationDebug = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [cartonizationData, setCartonizationData] = useState<any[]>([]);

  const testCartonization = async () => {
    setLoading(true);
    try {
      console.log('Testing cartonization edge function...');
      
      const { data, error } = await supabase.functions.invoke('recalculate-cartonization', {
        body: { orderIds: [49, 50] }
      });

      console.log('Edge function response:', { data, error });
      
      if (error) {
        setResult({ error: error.message });
      } else {
        setResult(data);
        // Refresh cartonization data
        await fetchCartonizationData();
      }
    } catch (error) {
      console.error('Error testing cartonization:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchCartonizationData = async () => {
    try {
      const { data, error } = await supabase
        .from('order_cartonization')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cartonization data:', error);
      } else {
        setCartonizationData(data || []);
      }
    } catch (error) {
      console.error('Error fetching cartonization data:', error);
    }
  };

  const clearCartonizationData = async () => {
    try {
      const { error } = await supabase
        .from('order_cartonization')
        .delete()
        .neq('id', 'dummy'); // Delete all records

      if (error) {
        console.error('Error clearing cartonization data:', error);
      } else {
        setCartonizationData([]);
        console.log('Cleared all cartonization data');
      }
    } catch (error) {
      console.error('Error clearing cartonization data:', error);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Cartonization Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={testCartonization} 
              disabled={loading}
            >
              {loading ? 'Testing...' : 'Test Cartonization (Orders 49, 50)'}
            </Button>
            <Button 
              onClick={fetchCartonizationData} 
              variant="secondary"
            >
              Refresh Data
            </Button>
            <Button 
              onClick={clearCartonizationData} 
              variant="destructive"
            >
              Clear All Data
            </Button>
          </div>

          {result && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Edge Function Result:</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-4">
            <h3 className="font-semibold mb-2">
              Stored Cartonization Data ({cartonizationData.length} records):
            </h3>
            <div className="space-y-2">
              {cartonizationData.map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Badge>Order {item.order_id}</Badge>
                  <span className="text-sm">
                    Box: {item.recommended_box_data?.name || 'Unknown'}
                  </span>
                  <span className="text-sm">
                    Utilization: {item.utilization?.toFixed(1)}%
                  </span>
                  <span className="text-sm">
                    Confidence: {item.confidence}%
                  </span>
                  <span className="text-sm">
                    Weight: {item.total_weight?.toFixed(1)} lbs
                  </span>
                </div>
              ))}
              {cartonizationData.length === 0 && (
                <p className="text-sm text-muted-foreground">No cartonization data found.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
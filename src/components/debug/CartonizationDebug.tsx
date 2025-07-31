import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const CartonizationDebug = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testManualCartonization = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log('Testing manual cartonization...');
      
      // Test data for orders 49 and 50
      const testItems = [
        {
          id: "2",
          name: "Programming Guide", 
          length: 9,
          width: 7,
          height: 1.5,
          weight: 2.1,
          quantity: 1
        },
        {
          id: "1", 
          name: "Wireless Headphones",
          length: 8,
          width: 6,
          height: 3,
          weight: 0.8,
          quantity: 1
        }
      ];
      
      // Test boxes
      const testBoxes = [
        { id: "1", name: "Small Poly Bag", length: 10, width: 8, height: 2, maxWeight: 5, cost: 0.75 },
        { id: "2", name: "Large Poly Bag", length: 16, width: 12, height: 4, maxWeight: 15, cost: 1.25 },
        { id: "3", name: "Small Box", length: 8, width: 6, height: 4, maxWeight: 10, cost: 1.50 },
        { id: "4", name: "Medium Box", length: 12, width: 9, height: 6, maxWeight: 25, cost: 2.75 },
        { id: "5", name: "Large Box", length: 18, width: 12, height: 8, maxWeight: 50, cost: 4.25 }
      ];

      // Simple test algorithm
      const totalWeight = testItems.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
      console.log(`Total weight: ${totalWeight} lbs`);
      
      let bestBox = null;
      let bestUtilization = 0;
      
      for (const box of testBoxes) {
        if (box.maxWeight < totalWeight) {
          console.log(`❌ Box ${box.name} can't handle weight ${totalWeight} (max: ${box.maxWeight})`);
          continue;
        }
        
        // Check if all items fit with rotation
        let allItemsFit = true;
        let totalItemVolume = 0;
        
        for (const item of testItems) {
          const orientations = [
            { l: item.length, w: item.width, h: item.height },
            { l: item.length, w: item.height, h: item.width },
            { l: item.width, w: item.length, h: item.height },
            { l: item.width, w: item.height, h: item.length },
            { l: item.height, w: item.length, h: item.width },
            { l: item.height, w: item.width, h: item.length }
          ];
          
          let itemFits = false;
          for (const o of orientations) {
            if (o.l <= box.length && o.w <= box.width && o.h <= box.height) {
              itemFits = true;
              totalItemVolume += o.l * o.w * o.h;
              console.log(`✅ ${item.name} fits in ${box.name} as ${o.l}x${o.w}x${o.h}`);
              break;
            }
          }
          
          if (!itemFits) {
            console.log(`❌ ${item.name} doesn't fit in ${box.name}`);
            allItemsFit = false;
            break;
          }
        }
        
        if (allItemsFit) {
          const boxVolume = box.length * box.width * box.height;
          const utilization = totalItemVolume / boxVolume;
          console.log(`✅ Box ${box.name}: ${(utilization * 100).toFixed(1)}% utilization`);
          
          if (utilization > bestUtilization) {
            bestBox = box;
            bestUtilization = utilization;
          }
        }
      }
      
      if (bestBox) {
        setResult({
          success: true,
          recommendedBox: bestBox,
          utilization: bestUtilization,
          confidence: Math.min(95, Math.max(50, bestUtilization * 100)),
          totalWeight,
          message: `✅ SUCCESS: ${bestBox.name} recommended with ${(bestUtilization * 100).toFixed(1)}% utilization`
        });
        
        // Now test the actual edge function
        const { data: edgeResult, error } = await supabase.functions.invoke('recalculate-cartonization', {
          body: { orderIds: [49, 50] }
        });
        
        console.log('Edge function result:', { data: edgeResult, error });
        
      } else {
        setResult({
          success: false,
          message: "❌ FAILED: No suitable box found"
        });
      }
      
    } catch (error) {
      console.error('Error in manual test:', error);
      setResult({ 
        success: false, 
        error: error.message,
        message: `❌ ERROR: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cartonization Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testManualCartonization} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Testing...' : 'Test Orders 49 & 50 Cartonization'}
        </Button>

        {result && (
          <div className="space-y-2">
            <Badge variant={result.success ? "default" : "destructive"}>
              {result.success ? "SUCCESS" : "FAILED"}
            </Badge>
            <p className="text-sm">{result.message}</p>
            {result.success && result.recommendedBox && (
              <div className="text-xs space-y-1 bg-green-50 p-2 rounded">
                <div>Box: {result.recommendedBox.name}</div>
                <div>Dimensions: {result.recommendedBox.length}×{result.recommendedBox.width}×{result.recommendedBox.height}</div>
                <div>Utilization: {(result.utilization * 100).toFixed(1)}%</div>
                <div>Weight: {result.totalWeight} lbs (max: {result.recommendedBox.maxWeight})</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
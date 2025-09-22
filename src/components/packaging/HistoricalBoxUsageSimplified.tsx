import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Package, RefreshCw } from "lucide-react";

interface BoxUsageData {
  boxSku: string;
  usage_count: number;
  percentage_of_shipments: number;
}

export const HistoricalBoxUsageSimplified = () => {
  const { userProfile } = useAuth();
  const [boxUsageData, setBoxUsageData] = useState<BoxUsageData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBoxUsage = async () => {
    if (!userProfile?.company_id) {
      console.log('No user profile or company_id found:', { 
        userProfile, 
        company_id: userProfile?.company_id 
      });
      setBoxUsageData([]);
      setLoading(false);
      return;
    }

    console.log('Fetching box usage for company:', userProfile.company_id);

    try {
      setLoading(true);

      // Get shipments with actual box data
      const { data: shipmentsWithBoxes, error: shipmentError } = await supabase
        .from('shipments')
        .select('actual_package_sku')
        .eq('company_id', userProfile.company_id)
        .not('actual_package_sku', 'is', null);

      if (shipmentError) {
        console.error('Error fetching shipments:', shipmentError);
        throw shipmentError;
      }

      console.log('Shipments with box data:', shipmentsWithBoxes?.length || 0);

      // Get total shipments for percentage calculation
      const { data: totalShipmentsData } = await supabase
        .from('shipments')
        .select('id', { count: 'exact' })
        .eq('company_id', userProfile.company_id);

      const totalShipments = totalShipmentsData?.length || 0;

      // Aggregate box usage
      const boxUsage = new Map<string, number>();

      shipmentsWithBoxes?.forEach(shipment => {
        if (shipment.actual_package_sku) {
          boxUsage.set(shipment.actual_package_sku, (boxUsage.get(shipment.actual_package_sku) || 0) + 1);
        }
      });

      // Convert to array and calculate percentages
      const usageData: BoxUsageData[] = Array.from(boxUsage.entries())
        .map(([boxSku, count]) => ({
          boxSku,
          usage_count: count,
          percentage_of_shipments: totalShipments > 0 ? Math.round((count / totalShipments) * 100) : 0
        }))
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 10); // Show top 10

      console.log('Box usage data:', usageData);
      
      setBoxUsageData(usageData);
    } catch (error) {
      console.error('Error fetching box usage:', error);
      setBoxUsageData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoxUsage();
  }, [userProfile?.company_id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Box Usage History
          </CardTitle>
          <CardDescription>
            {boxUsageData.length === 0 
              ? "No box usage data available from shipments."
              : `Showing ${boxUsageData.length} different box types from shipments`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {boxUsageData.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Box Usage Data Found</h3>
              <p className="text-muted-foreground mb-4">
                Create shipments with selected boxes to see usage statistics.
              </p>
              <Button onClick={fetchBoxUsage} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{boxUsageData.length}</div>
                <div className="text-sm text-muted-foreground">Different Boxes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {boxUsageData.reduce((sum, item) => sum + item.usage_count, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Shipments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {boxUsageData[0]?.boxSku || 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Most Common</div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Most Used Box Types</h4>
              {boxUsageData.map((box, index) => (
                <div key={box.boxSku} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <div>
                      <div className="font-medium">{box.boxSku}</div>
                      <div className="text-sm text-muted-foreground">
                        {box.percentage_of_shipments}% of shipments
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">{box.usage_count}</div>
                    <div className="text-xs text-muted-foreground">shipments</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
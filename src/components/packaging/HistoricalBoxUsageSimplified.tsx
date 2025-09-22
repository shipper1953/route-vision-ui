import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Package, RefreshCw } from "lucide-react";

interface DimensionUsageData {
  dimensions: string;
  usage_count: number;
  percentage_of_shipments: number;
}

export const HistoricalBoxUsageSimplified = () => {
  const { userProfile } = useAuth();
  const [dimensionUsageData, setDimensionUsageData] = useState<DimensionUsageData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDimensionUsage = async () => {
    if (!userProfile?.company_id) {
      console.log('No user profile or company_id found:', { 
        userProfile, 
        company_id: userProfile?.company_id 
      });
      setDimensionUsageData([]);
      setLoading(false);
      return;
    }

    console.log('Fetching shipment dimensions for company:', userProfile.company_id);

    try {
      setLoading(true);

      // Get shipments with dimensions
      const { data: shipmentsWithDimensions, error: shipmentError } = await supabase
        .from('shipments')
        .select('package_dimensions')
        .eq('company_id', userProfile.company_id)
        .not('package_dimensions', 'is', null);

      if (shipmentError) {
        console.error('Error fetching shipments:', shipmentError);
        throw shipmentError;
      }

      console.log('Shipments with dimensions:', shipmentsWithDimensions?.length || 0);

      // Get total shipments for percentage calculation
      const { data: totalShipmentsData } = await supabase
        .from('shipments')
        .select('id', { count: 'exact' })
        .eq('company_id', userProfile.company_id);

      const totalShipments = totalShipmentsData?.length || 0;

      // Aggregate dimension usage
      const dimensionUsage = new Map<string, number>();

      shipmentsWithDimensions?.forEach(shipment => {
        const dims = shipment.package_dimensions as any;
        if (dims && dims.length && dims.width && dims.height) {
          const dimensionKey = `${parseFloat(dims.length).toFixed(1)}" × ${parseFloat(dims.width).toFixed(1)}" × ${parseFloat(dims.height).toFixed(1)}"`;
          dimensionUsage.set(dimensionKey, (dimensionUsage.get(dimensionKey) || 0) + 1);
        }
      });

      // Convert to array and calculate percentages
      const usageData: DimensionUsageData[] = Array.from(dimensionUsage.entries())
        .map(([dimensions, count]) => ({
          dimensions,
          usage_count: count,
          percentage_of_shipments: totalShipments > 0 ? Math.round((count / totalShipments) * 100) : 0
        }))
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 10); // Show top 10

      console.log('Dimension usage data:', usageData);
      
      setDimensionUsageData(usageData);
    } catch (error) {
      console.error('Error fetching dimension usage:', error);
      setDimensionUsageData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDimensionUsage();
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
            Package Dimensions History
          </CardTitle>
          <CardDescription>
            {dimensionUsageData.length === 0 
              ? "No dimension data available from shipments."
              : `Showing ${dimensionUsageData.length} different package dimensions from shipments`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dimensionUsageData.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Dimension Data Found</h3>
              <p className="text-muted-foreground mb-4">
                No shipments found with package dimension data.
              </p>
              <Button onClick={fetchDimensionUsage} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{dimensionUsageData.length}</div>
                <div className="text-sm text-muted-foreground">Different Sizes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {dimensionUsageData.reduce((sum, item) => sum + item.usage_count, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Shipments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {dimensionUsageData[0]?.dimensions || 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Most Common</div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Most Used Package Dimensions</h4>
              {dimensionUsageData.map((dimension, index) => (
                <div key={dimension.dimensions} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <div>
                      <div className="font-medium">{dimension.dimensions}</div>
                      <div className="text-sm text-muted-foreground">
                        {dimension.percentage_of_shipments}% of shipments
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">{dimension.usage_count}</div>
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
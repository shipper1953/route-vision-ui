import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Package, RefreshCw } from "lucide-react";

interface BoxUsageData {
  box_sku: string;
  usage_count: number;
  percentage_of_orders: number;
}

export const HistoricalBoxUsageSimplified = () => {
  const { userProfile } = useAuth();
  const [boxUsageData, setBoxUsageData] = useState<BoxUsageData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLatestBoxUsage = async () => {
    if (!userProfile?.company_id) {
      console.log('No user profile or company_id found:', { 
        userProfile, 
        company_id: userProfile?.company_id 
      });
      setBoxUsageData([]);
      setLoading(false);
      return;
    }

    console.log('Fetching comprehensive box usage for company:', userProfile.company_id);

    try {
      setLoading(true);

      // Get total orders count
      const { data: orderCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .eq('company_id', userProfile.company_id);

      const totalOrders = orderCount?.length || 0;
      console.log('Total orders for company:', totalOrders);

      // Get data from packaging intelligence reports
      const { data: reports, error: reportError } = await supabase
        .from('packaging_intelligence_reports')
        .select('top_5_most_used_boxes, total_orders_analyzed')
        .eq('company_id', userProfile.company_id)
        .order('generated_at', { ascending: false });

      console.log('Reports found:', reports?.length || 0);

      // Get data from order cartonization
      const { data: cartonization, error: cartonError } = await supabase
        .from('order_cartonization')
        .select(`
          recommended_box_data,
          order_id,
          orders!inner(company_id)
        `)
        .eq('orders.company_id', userProfile.company_id);

      console.log('Cartonization records found:', cartonization?.length || 0);

      // Aggregate box usage from all sources
      const boxUsage = new Map<string, { count: number, orders: Set<number> }>();

      // Process packaging intelligence reports
      if (reports && !reportError) {
        reports.forEach(report => {
          if (report.top_5_most_used_boxes && Array.isArray(report.top_5_most_used_boxes)) {
            report.top_5_most_used_boxes.forEach((box: any) => {
              const sku = box.box_sku || 'Unknown';
              const usage = box.total_usage || box.recommended_usage || 0;
              
              if (!boxUsage.has(sku)) {
                boxUsage.set(sku, { count: 0, orders: new Set() });
              }
              boxUsage.get(sku)!.count += usage;
            });
          }
        });
      }

      // Process cartonization data
      if (cartonization && !cartonError) {
        cartonization.forEach(record => {
          if (record.recommended_box_data) {
            const boxData = record.recommended_box_data as any;
            const sku = boxData.name || boxData.sku || 'Unknown';
            
            if (!boxUsage.has(sku)) {
              boxUsage.set(sku, { count: 0, orders: new Set() });
            }
            
            boxUsage.get(sku)!.count += 1;
            boxUsage.get(sku)!.orders.add(record.order_id);
          }
        });
      }

      // Convert to array and calculate percentages
      const usageData: BoxUsageData[] = Array.from(boxUsage.entries())
        .map(([sku, data]) => ({
          box_sku: sku,
          usage_count: data.count,
          percentage_of_orders: totalOrders > 0 ? Math.round((data.orders.size / totalOrders) * 100) : 0
        }))
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 10); // Show top 10

      console.log('Final aggregated usage data:', usageData);
      console.log('Total unique boxes found:', usageData.length);
      
      setBoxUsageData(usageData);
    } catch (error) {
      console.error('Error fetching comprehensive box usage:', error);
      setBoxUsageData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestBoxUsage();
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
              ? "No box usage data available. Generate a packaging intelligence report to see usage statistics."
              : `Showing usage data for ${boxUsageData.length} box types from recent orders`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {boxUsageData.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Usage Data Found</h3>
              <p className="text-muted-foreground mb-4">
                Generate a packaging intelligence report to see which boxes are being used most frequently.
              </p>
              <Button onClick={fetchLatestBoxUsage} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{boxUsageData.length}</div>
                  <div className="text-sm text-muted-foreground">Box Types Used</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {boxUsageData.reduce((sum, item) => sum + item.usage_count, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Uses</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {boxUsageData[0]?.box_sku || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">Most Popular</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Most Used Boxes</h4>
                {boxUsageData.map((box, index) => (
                  <div key={box.box_sku} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{box.box_sku}</div>
                        <div className="text-sm text-muted-foreground">
                          {box.percentage_of_orders}% of analyzed orders
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">{box.usage_count}</div>
                      <div className="text-xs text-muted-foreground">uses</div>
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
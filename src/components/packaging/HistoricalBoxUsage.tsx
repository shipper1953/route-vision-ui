import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Package, 
  Search, 
  TrendingUp, 
  Calendar,
  BarChart3,
  Filter
} from "lucide-react";

interface BoxUsageData {
  sku: string;
  name?: string;
  totalUsage: number;
  lastUsed: string;
  trend: 'up' | 'down' | 'stable';
}

export const HistoricalBoxUsage = () => {
  const { userProfile } = useAuth();
  const [boxUsageData, setBoxUsageData] = useState<BoxUsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'usage' | 'sku' | 'lastUsed'>('usage');

  const fetchHistoricalUsage = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);

      // Get all packaging intelligence reports for comprehensive data
      const { data: reports, error: reportsError } = await supabase
        .from('packaging_intelligence_reports')
        .select('projected_packaging_need, top_5_most_used_boxes, generated_at')
        .eq('company_id', userProfile.company_id)
        .order('generated_at', { ascending: false })
        .limit(10);

      if (reportsError) {
        console.error('Error fetching reports:', reportsError);
        return;
      }

      // Fetch actual shipment data with real package SKUs
      const { data: shipments, error: shipmentsError } = await supabase
        .from('shipments')
        .select(`
          actual_package_sku,
          actual_package_master_id,
          created_at,
          status
        `)
        .eq('company_id', userProfile.company_id)
        .not('actual_package_sku', 'is', null)
        .in('status', ['shipped', 'delivered'])
        .order('created_at', { ascending: false })
        .limit(1000);

      if (shipmentsError) {
        console.error('Error fetching shipments:', shipmentsError);
      }

      // Combine data from reports and shipments
      const boxUsageMap = new Map<string, { count: number, lastUsed: Date, name?: string }>();

      // Process intelligence reports - fix data structure handling
      reports?.forEach(report => {
        if (report.projected_packaging_need && typeof report.projected_packaging_need === 'object') {
          Object.entries(report.projected_packaging_need as Record<string, number>).forEach(([sku, count]) => {
            const existing = boxUsageMap.get(sku) || { count: 0, lastUsed: new Date(0) };
            boxUsageMap.set(sku, {
              count: Math.max(existing.count, count as number),
              lastUsed: new Date(Math.max(existing.lastUsed.getTime(), new Date(report.generated_at).getTime()))
            });
          });
        }

        // Handle top_5_most_used_boxes - fix iteration issue
        if (Array.isArray(report.top_5_most_used_boxes)) {
          report.top_5_most_used_boxes.forEach((box: any) => {
            let sku: string, count: number;
            
            // Handle different data formats
            if (typeof box === 'object' && box.box_sku) {
              sku = box.box_sku;
              count = box.total_usage || box.usage_count || 1;
            } else if (Array.isArray(box) && box.length >= 2) {
              [sku, count] = box;
            } else {
              return; // Skip invalid entries
            }
            
            const existing = boxUsageMap.get(sku) || { count: 0, lastUsed: new Date(0) };
            boxUsageMap.set(sku, {
              count: Math.max(existing.count, count),
              lastUsed: new Date(Math.max(existing.lastUsed.getTime(), new Date(report.generated_at).getTime())),
              name: sku
            });
          });
        }
      });

      // Process actual shipped packages with real SKUs
      shipments?.forEach(shipment => {
        if (shipment.actual_package_sku) {
          const sku = shipment.actual_package_sku;
          const existing = boxUsageMap.get(sku) || { count: 0, lastUsed: new Date(0) };
          boxUsageMap.set(sku, {
            count: existing.count + 1,
            lastUsed: new Date(Math.max(existing.lastUsed.getTime(), new Date(shipment.created_at).getTime())),
            name: sku // Use the SKU as the display name
          });
        }
      });

      // Convert to array and calculate trends (simplified)
      const boxUsageArray: BoxUsageData[] = Array.from(boxUsageMap.entries()).map(([sku, data]) => {
        const daysSinceLastUsed = Math.floor((Date.now() - data.lastUsed.getTime()) / (1000 * 60 * 60 * 24));
        let trend: 'up' | 'down' | 'stable' = 'stable';
        
        if (daysSinceLastUsed < 7 && data.count > 5) trend = 'up';
        else if (daysSinceLastUsed > 30) trend = 'down';

        return {
          sku,
          name: data.name,
          totalUsage: data.count,
          lastUsed: data.lastUsed.toISOString(),
          trend
        };
      }).filter(item => item.totalUsage > 0);

      setBoxUsageData(boxUsageArray);
    } catch (error) {
      console.error('Error fetching historical usage:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoricalUsage();
  }, [userProfile?.company_id]);

  const filteredAndSortedData = boxUsageData
    .filter(item => 
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'usage':
          return b.totalUsage - a.totalUsage;
        case 'sku':
          return a.sku.localeCompare(b.sku);
        case 'lastUsed':
          return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
        default:
          return 0;
      }
    });

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'default';
      case 'down': return 'secondary';
      default: return 'outline';
    }
  };

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
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Historical Box Usage Analytics
          </CardTitle>
            <CardDescription>
              {boxUsageData.length === 0 
                ? "Track actual box usage from shipped orders. Start scanning boxes during shipping to populate this data."
                : `Actual box usage from ${boxUsageData.length} different box types in shipped orders`
              }
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search box SKUs or dimensions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'usage' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('usage')}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                By Usage
              </Button>
              <Button
                variant={sortBy === 'sku' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('sku')}
              >
                <Filter className="h-4 w-4 mr-1" />
                By SKU
              </Button>
              <Button
                variant={sortBy === 'lastUsed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('lastUsed')}
              >
                <Calendar className="h-4 w-4 mr-1" />
                By Date
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{boxUsageData.length}</div>
              <div className="text-sm text-muted-foreground">Total Box Types</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {boxUsageData.reduce((sum, item) => sum + item.totalUsage, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Usage Count</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {boxUsageData.filter(item => item.trend === 'up').length}
              </div>
              <div className="text-sm text-muted-foreground">Trending Up</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Usage Breakdown</CardTitle>
          <CardDescription>
            {filteredAndSortedData.length} of {boxUsageData.length} box types shown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAndSortedData.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Actual Usage Data Found</h3>
              <p className="text-muted-foreground">
                {boxUsageData.length === 0 
                  ? "Start scanning box SKUs during the shipping process to track actual usage. This data comes from the 'actual_package_sku' field in shipped orders."
                  : "Try adjusting your search criteria."}
              </p>
              {boxUsageData.length === 0 && (
                <Button onClick={fetchHistoricalUsage} className="mt-4">
                  Refresh Data
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Box SKU / Dimensions</th>
                    <th className="text-center py-3 px-4">Total Usage</th>
                    <th className="text-center py-3 px-4">Last Used</th>
                    <th className="text-center py-3 px-4">Trend</th>
                    <th className="text-right py-3 px-4">Usage %</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedData.map((item, index) => {
                    const totalUsage = boxUsageData.reduce((sum, box) => sum + box.totalUsage, 0);
                    const usagePercentage = ((item.totalUsage / totalUsage) * 100).toFixed(1);
                    const daysSinceLastUsed = Math.floor(
                      (Date.now() - new Date(item.lastUsed).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    
                    return (
                      <tr key={item.sku} className="border-b hover:bg-muted/20">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <div>
                              <div className="font-medium">{item.sku}</div>
                              {item.name && (
                                <div className="text-sm text-muted-foreground">{item.name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className="font-semibold text-lg">{item.totalUsage}</span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <div className="text-sm">
                            {daysSinceLastUsed === 0 
                              ? 'Today'
                              : daysSinceLastUsed === 1
                              ? 'Yesterday'
                              : `${daysSinceLastUsed} days ago`}
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {getTrendIcon(item.trend)}
                            <Badge variant={getTrendColor(item.trend)} className="text-xs">
                              {item.trend.toUpperCase()}
                            </Badge>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-medium">{usagePercentage}%</span>
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${usagePercentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
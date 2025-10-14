import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Package, RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DateRangeSelector, type DateRangePreset } from "./DateRangeSelector";

interface BoxUsageData {
  boxSku: string;
  boxName: string;
  length: number;
  width: number;
  height: number;
  cost: number;
  usage_count: number;
  percentage_of_shipments: number;
  first_used: string;
  last_used: string;
}

export const HistoricalBoxUsageSimplified = () => {
  const { userProfile } = useAuth();
  const [boxUsageData, setBoxUsageData] = useState<BoxUsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalShipments, setTotalShipments] = useState(0);
  const [shipmentsWithoutBox, setShipmentsWithoutBox] = useState(0);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>("month");

  const fetchBoxUsage = async (from: Date, to: Date) => {
    if (!userProfile?.company_id) {
      setBoxUsageData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get all shipments in date range for total count
      const { data: allShipments, error: totalError } = await supabase
        .from('shipments')
        .select('id, actual_package_sku')
        .eq('company_id', userProfile.company_id)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString());

      if (totalError) throw totalError;

      const totalCount = allShipments?.length || 0;
      const withoutBoxCount = allShipments?.filter(s => !s.actual_package_sku).length || 0;
      
      setTotalShipments(totalCount);
      setShipmentsWithoutBox(withoutBoxCount);

      // Get shipments with box data and join with boxes table
      const { data: shipmentsWithBoxes, error: shipmentError } = await supabase
        .from('shipments')
        .select(`
          actual_package_sku,
          created_at
        `)
        .eq('company_id', userProfile.company_id)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .not('actual_package_sku', 'is', null);

      if (shipmentError) throw shipmentError;

      // Aggregate box usage with dates
      const boxUsageMap = new Map<string, { count: number; dates: Date[] }>();

      shipmentsWithBoxes?.forEach(shipment => {
        if (shipment.actual_package_sku) {
          const existing = boxUsageMap.get(shipment.actual_package_sku);
          if (existing) {
            existing.count++;
            existing.dates.push(new Date(shipment.created_at));
          } else {
            boxUsageMap.set(shipment.actual_package_sku, {
              count: 1,
              dates: [new Date(shipment.created_at)]
            });
          }
        }
      });

      // Get all boxes for the company (to match against both name and SKU)
      const { data: boxes, error: boxError } = await supabase
        .from('boxes')
        .select('sku, name, length, width, height, cost')
        .eq('company_id', userProfile.company_id);

      if (boxError) throw boxError;
      
      console.log('Box identifiers from shipments:', Array.from(boxUsageMap.keys()));
      console.log('Boxes found in database:', boxes);

      // Combine data - match by name OR sku
      const usageData: BoxUsageData[] = Array.from(boxUsageMap.entries())
        .map(([identifier, usage]) => {
          const boxInfo = boxes?.find(b => b.name === identifier || b.sku === identifier);
          const sortedDates = usage.dates.sort((a, b) => a.getTime() - b.getTime());
          
          if (!boxInfo) {
            console.warn(`Box info not found for identifier: ${identifier}`);
          }
          
          return {
            boxSku: boxInfo?.sku || identifier,
            boxName: boxInfo?.name || identifier,
            length: Number(boxInfo?.length) || 0,
            width: Number(boxInfo?.width) || 0,
            height: Number(boxInfo?.height) || 0,
            cost: Number(boxInfo?.cost) || 0,
            usage_count: usage.count,
            percentage_of_shipments: totalCount > 0 ? Math.round((usage.count / totalCount) * 100) : 0,
            first_used: sortedDates[0].toISOString(),
            last_used: sortedDates[sortedDates.length - 1].toISOString()
          };
        })
        .sort((a, b) => b.usage_count - a.usage_count);
      
      setBoxUsageData(usageData);
    } catch (error) {
      console.error('Error fetching box usage:', error);
      setBoxUsageData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (range: { from: Date; to: Date }, preset: DateRangePreset) => {
    setDateRange(range);
    setSelectedPreset(preset);
    fetchBoxUsage(range.from, range.to);
  };

  useEffect(() => {
    if (userProfile?.company_id) {
      fetchBoxUsage(dateRange.from, dateRange.to);
    }
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
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Box Usage History
              </CardTitle>
              <CardDescription>
                Historical analysis of box usage across shipments
              </CardDescription>
            </div>
            <DateRangeSelector selectedPreset={selectedPreset} onRangeChange={handleDateRangeChange} />
          </div>
        </CardHeader>
        <CardContent>
          {shipmentsWithoutBox > 0 && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {shipmentsWithoutBox} of {totalShipments} shipments in this period don't have box data assigned.
              </AlertDescription>
            </Alert>
          )}

          {boxUsageData.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Box Usage Data Found</h3>
              <p className="text-muted-foreground mb-4">
                {totalShipments === 0 
                  ? "No shipments found in the selected date range."
                  : "Create shipments with selected boxes to see usage statistics."}
              </p>
              <Button onClick={() => fetchBoxUsage(dateRange.from, dateRange.to)} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{boxUsageData.length}</div>
                  <div className="text-sm text-muted-foreground">Different Boxes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{totalShipments}</div>
                  <div className="text-sm text-muted-foreground">Total Shipments</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {boxUsageData.reduce((sum, item) => sum + item.usage_count, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">With Box Data</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {boxUsageData[0]?.boxName || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">Most Common</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-lg">Box Usage Details</h4>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">#</th>
                          <th className="text-left p-3 font-medium">Box Name</th>
                          <th className="text-left p-3 font-medium">SKU</th>
                          <th className="text-left p-3 font-medium">Dimensions (L×W×H)</th>
                          <th className="text-left p-3 font-medium">Cost</th>
                          <th className="text-left p-3 font-medium">Usage</th>
                          <th className="text-left p-3 font-medium">% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {boxUsageData.map((box, index) => (
                          <tr key={box.boxSku} className="border-t hover:bg-muted/20">
                            <td className="p-3">
                              <Badge variant="outline">#{index + 1}</Badge>
                            </td>
                            <td className="p-3 font-medium">{box.boxName}</td>
                            <td className="p-3 text-muted-foreground">{box.boxSku}</td>
                            <td className="p-3 text-sm">
                              {box.length > 0 && box.width > 0 && box.height > 0 
                                ? `${box.length}×${box.width}×${box.height} in`
                                : 'N/A'}
                            </td>
                            <td className="p-3 text-sm">
                              {box.cost > 0 ? `$${box.cost.toFixed(2)}` : 'N/A'}
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-green-600">{box.usage_count}</div>
                              <div className="text-xs text-muted-foreground">shipments</div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-muted rounded-full h-2">
                                  <div 
                                    className="bg-primary h-2 rounded-full"
                                    style={{ width: `${box.percentage_of_shipments}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">{box.percentage_of_shipments}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
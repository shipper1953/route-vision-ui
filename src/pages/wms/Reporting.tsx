import { useState } from "react";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWmsReporting, WmsReport } from "@/hooks/useWmsReporting";
import { Package, TrendingUp, Clock, CheckCircle2, BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Reporting() {
  const { loading, generateReport } = useWmsReporting();
  const [report, setReport] = useState<WmsReport | null>(null);
  const [period, setPeriod] = useState('7');

  const handleGenerateReport = async () => {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString();
    
    const reportData = await generateReport(startDate, endDate);
    if (reportData) {
      setReport(reportData);
    }
  };

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">WMS Reports & Analytics</h1>
            <p className="text-muted-foreground">
              Performance metrics and insights
            </p>
          </div>
          
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={handleGenerateReport} disabled={loading}>
              <BarChart3 className="h-4 w-4 mr-2" />
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </div>

        {report && (
          <>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Receiving Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sessions Completed</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{report.receiving.sessionsCompleted}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Received</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{report.receiving.totalReceived}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Items Received</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{report.receiving.itemsReceived}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{report.receiving.averageReceivingTime}m</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Inventory Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{report.inventory.totalSKUs}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Units</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{report.inventory.totalUnits.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                    <TrendingUp className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{report.inventory.lowStockItems}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Turnover Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{report.inventory.turnoverRate}x</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Picking Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Picks</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{report.picking.totalPicks}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pick Accuracy</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{report.picking.pickAccuracy}%</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Pick Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{report.picking.averagePickTime}m</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{report.picking.completedPickLists}</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}

        {!report && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Report Generated</h3>
              <p className="text-muted-foreground text-center mb-4">
                Select a time period and click "Generate Report" to view analytics
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </TmsLayout>
  );
}

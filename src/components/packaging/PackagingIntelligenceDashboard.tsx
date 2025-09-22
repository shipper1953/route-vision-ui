import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Package, 
  BarChart3,
  RefreshCw,
  Bell
} from "lucide-react";

interface PackagingReport {
  id: string;
  generated_at: string;
  total_orders_analyzed: number;
  potential_savings: number;
  top_5_most_used_boxes: any; // JSON field from database
  top_5_box_discrepancies: any; // JSON field from database
  inventory_suggestions: any; // JSON field from database
  projected_packaging_need: any; // JSON field from database
}

interface PackagingAlert {
  id: string;
  alert_type: string;
  message: string;
  severity: string; // Database returns string, we'll handle typing in render
  created_at: string;
}

export const PackagingIntelligenceDashboard = () => {
  const { userProfile } = useAuth();
  const [report, setReport] = useState<PackagingReport | null>(null);
  const [alerts, setAlerts] = useState<PackagingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchLatestReport = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('packaging_intelligence_reports')
        .select('id, generated_at, total_orders_analyzed, potential_savings, top_5_most_used_boxes, top_5_box_discrepancies, inventory_suggestions, projected_packaging_need')
        .eq('company_id', userProfile.company_id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching report:', error);
        return;
      }

      setReport(data ?? null);
    } catch (error) {
      console.error('Error fetching report:', error);
    }
  };

  const fetchAlerts = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('packaging_alerts')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching alerts:', error);
        return;
      }

      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const processExistingOrders = async () => {
    if (!userProfile?.company_id) return;

    setGenerating(true);
    try {
      console.log('Processing existing orders for cartonization...');
      const { data: processData, error: processError } = await supabase.functions.invoke('process-existing-orders', {
        body: { company_id: userProfile.company_id }
      });

      if (processError) {
        console.error('Error processing orders:', processError);
        throw processError;
      }

      console.log('Order processing result:', processData);
      
      // Now generate the intelligence report
      const { data: reportData, error: reportError } = await supabase.functions.invoke('generate-packaging-intelligence', {
        body: { company_id: userProfile.company_id }
      });

      if (reportError) {
        console.error('Error generating report:', reportError);
        throw reportError;
      }

      console.log('Report generation result:', reportData);
      
      // Fetch the newly generated report and alerts
      await fetchLatestReport();
      await fetchAlerts();
      
      alert(`Successfully processed ${processData?.processed || 0} orders and generated intelligence report!`);
    } catch (error) {
      console.error('Error processing orders and generating report:', error);
      alert('Failed to process orders and generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const generateReport = async () => {
    if (!userProfile?.company_id) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-packaging-intelligence', {
        body: { company_id: userProfile.company_id }
      });

      if (error) {
        console.error('Error generating report:', error);
        throw error;
      }

      console.log('Report generation result:', data);
      
      // Fetch the newly generated report
      await fetchLatestReport();
      await fetchAlerts();
    } catch (error) {
      console.error('Error generating report:', error);
      // Show user-friendly error message
      alert('Failed to generate packaging intelligence report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchLatestReport(), fetchAlerts()]);
      setLoading(false);
    };

    loadData();
  }, [userProfile?.company_id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive' as const;
      case 'warning': return 'secondary' as const;
      default: return 'default' as const;
    }
  };

  const getSuggestionColor = (suggestion: string) => {
    switch (suggestion) {
      case 'ORDER SOON': return 'destructive';
      case 'TOO MUCH STOCK': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">📦 Packaging Intelligence Center</h2>
          <p className="text-muted-foreground">Strategic cost optimization and inventory insights</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={processExistingOrders}
            disabled={generating}
            className="gap-2"
            variant="outline"
          >
            <Package className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Processing...' : 'Process Orders & Generate Report'}
          </Button>
          <Button 
            onClick={generateReport}
            disabled={generating}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : 'Generate New Report'}
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Bell className="h-5 w-5" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.slice(0, 3).map((alert) => (
              <Alert key={alert.id} className="border-orange-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{alert.message}</span>
                  <Badge variant={getSeverityColor(alert.severity)}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                </AlertDescription>
              </Alert>
            ))}
            {alerts.length > 3 && (
              <p className="text-sm text-muted-foreground">
                +{alerts.length - 3} more alerts
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!report ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Intelligence Report Available</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first packaging intelligence report to see cost optimization opportunities.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={processExistingOrders} disabled={generating} className="gap-2" variant="outline">
                <Package className="h-4 w-4" />
                Process Orders First
              </Button>
              <Button onClick={generateReport} disabled={generating} className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Generate Report Only
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Potential Savings</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${report.potential_savings.toFixed(2)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Orders Analyzed</p>
                    <p className="text-2xl font-bold text-primary">
                      {report.total_orders_analyzed}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Optimization Rate</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {Array.isArray(report.top_5_box_discrepancies) && report.top_5_box_discrepancies.length > 0 
                        ? `${((report.top_5_box_discrepancies.length / report.total_orders_analyzed) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Report Age</p>
                    <p className="text-2xl font-bold text-muted-foreground">
                      {new Date(report.generated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <RefreshCw className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Opportunities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Top Packaging Opportunities
                </CardTitle>
                <CardDescription>
                  Boxes most often replaced with better options
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!Array.isArray(report.top_5_box_discrepancies) || report.top_5_box_discrepancies.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No optimization opportunities found. Your packaging choices look efficient!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(Array.isArray(report.top_5_box_discrepancies) ? report.top_5_box_discrepancies : []).map((discrepancy: any, index: number) => (
                      <div key={discrepancy.order_id || index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <span className="font-medium text-sm">Order {discrepancy.order_id}</span>
                          </div>
                          <Badge variant="destructive" className="text-xs">
                            ${discrepancy.total_savings?.toFixed(2)} savings
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div><strong>Current:</strong> {discrepancy.actual_box}</div>
                          <div><strong>Better Option:</strong> {discrepancy.optimal_box}</div>
                          <div className="flex gap-4">
                            <span>Cube: {discrepancy.actual_cube} → {discrepancy.optimal_cube} cu.in</span>
                            <span>Utilization: {discrepancy.current_utilization}% → {discrepancy.optimal_utilization}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Most Used Boxes
                </CardTitle>
                <CardDescription>
                  Your highest volume packaging
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!Array.isArray(report.top_5_most_used_boxes) || report.top_5_most_used_boxes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No usage data available
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(Array.isArray(report.top_5_most_used_boxes) ? report.top_5_most_used_boxes : []).map((box: any, index: number) => (
                      <div key={box.box_sku || index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <div>
                            <div className="font-medium">{box.box_sku}</div>
                            <div className="text-xs text-muted-foreground">
                              {box.percentage_of_orders}% of orders
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">{box.total_usage || box.usage_count}</div>
                          <div className="text-xs text-muted-foreground">uses</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Inventory Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Inventory Health Dashboard
              </CardTitle>
               <CardDescription>
                 Recommended Uline boxes to add to your inventory
               </CardDescription>
            </CardHeader>
            <CardContent>
              {!Array.isArray(report.inventory_suggestions) || report.inventory_suggestions.length === 0 ? (
                 <p className="text-muted-foreground text-center py-8">
                   No inventory recommendations available. Great job - your current packaging choices look optimal!
                 </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                         <th className="text-left py-3 px-4">Uline Box SKU</th>
                         <th className="text-left py-3 px-4">Box Name</th>
                         <th className="text-right py-3 px-4">Orders Needing</th>
                         <th className="text-right py-3 px-4">Cost per Unit</th>
                         <th className="text-center py-3 px-4">Urgency</th>
                      </tr>
                    </thead>
                      <tbody>
                       {(Array.isArray(report.inventory_suggestions) ? report.inventory_suggestions : []).map((item: any) => (
                         <tr key={item.box_sku || item.box_id} className="border-b hover:bg-muted/20">
                           <td className="py-3 px-4 font-medium text-sm">{item.box_id}</td>
                           <td className="py-3 px-4 text-sm">{item.box_name}</td>
                           <td className="text-right py-3 px-4">
                             <Badge variant="outline">{item.projected_need}</Badge>
                           </td>
                           <td className="text-right py-3 px-4">
                             <span className="text-sm font-medium">${item.cost_per_unit?.toFixed(2) || '0.00'}</span>
                           </td>
                           <td className="text-center py-3 px-4">
                             <Badge variant={
                               item.urgency === 'high' ? 'destructive' :
                               item.urgency === 'medium' ? 'secondary' : 'default'
                             }>
                               {item.urgency?.toUpperCase() || 'LOW'}
                             </Badge>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
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
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching report:', error);
        return;
      }

      setReport(data);
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
        <Button 
          onClick={generateReport}
          disabled={generating}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Generating...' : 'Generate New Report'}
        </Button>
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
            <Button onClick={generateReport} disabled={generating} className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Generate First Report
            </Button>
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
                        ? `${((report.top_5_box_discrepancies.reduce((sum: number, [, count]: [string, number]) => sum + count, 0) / report.total_orders_analyzed) * 100).toFixed(1)}%`
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
                    No optimization opportunities found. Great job!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(Array.isArray(report.top_5_box_discrepancies) ? report.top_5_box_discrepancies : []).map(([boxId, count]: [string, number], index: number) => (
                      <div key={boxId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <span className="font-medium">{boxId}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-orange-600">{count}</div>
                          <div className="text-xs text-muted-foreground">opportunities</div>
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
                    {(Array.isArray(report.top_5_most_used_boxes) ? report.top_5_most_used_boxes : []).map(([boxId, count]: [string, number], index: number) => (
                      <div key={boxId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <span className="font-medium">{boxId}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">{count}</div>
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
                Current stock levels vs. projected needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!Array.isArray(report.inventory_suggestions) || report.inventory_suggestions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No inventory data available. Set up packaging inventory to see recommendations.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Box ID</th>
                        <th className="text-right py-3 px-4">Current Stock</th>
                        <th className="text-right py-3 px-4">Projected Need</th>
                        <th className="text-right py-3 px-4">Days Supply</th>
                        <th className="text-center py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(report.inventory_suggestions) ? report.inventory_suggestions : []).map((item: any) => (
                        <tr key={item.box_id} className="border-b hover:bg-muted/20">
                          <td className="py-3 px-4 font-medium">{item.box_id}</td>
                          <td className="text-right py-3 px-4">{item.current_stock}</td>
                          <td className="text-right py-3 px-4">{item.projected_need}</td>
                          <td className="text-right py-3 px-4">{item.days_of_supply.toFixed(1)}</td>
                          <td className="text-center py-3 px-4">
                            <Badge variant={getSuggestionColor(item.suggestion)}>
                              {item.suggestion}
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
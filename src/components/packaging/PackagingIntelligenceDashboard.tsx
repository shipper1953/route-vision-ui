import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  BarChart3,
  RefreshCw,
  Bell,
  Plus
} from "lucide-react";

interface PackagingReport {
  id: string;
  generated_at: string;
  total_orders_analyzed: number;
  potential_savings: number;
  top_5_most_used_boxes: any;
  top_5_box_discrepancies: any;
  inventory_suggestions: any;
  projected_packaging_need: any;
  report_data?: {
    shipments_with_packaging_data?: number;
    average_actual_utilization?: string;
    total_discrepancies_found?: number;
    total_potential_savings?: string;
    high_efficiency_shipments?: number;
    low_efficiency_shipments?: number;
    utilization_distribution?: {
      excellent?: number;
      good?: number;
      fair?: number;
      poor?: number;
    };
  };
}

interface PackagingIntelligenceDashboardProps {
  onAddToInventory?: (boxData: {
    name: string;
    sku: string;
    length: number;
    width: number;
    height: number;
    cost: number;
    box_type: 'box' | 'poly_bag' | 'envelope' | 'tube' | 'custom';
    max_weight?: number;
    in_stock?: number;
    min_stock?: number;
    max_stock?: number;
  }) => void;
}

export const PackagingIntelligenceDashboard = ({ onAddToInventory }: PackagingIntelligenceDashboardProps) => {
  const { userProfile } = useAuth();
  const [report, setReport] = useState<PackagingReport | null>(null);
  const [lowStockBoxes, setLowStockBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingBoxSku, setAddingBoxSku] = useState<string | null>(null);

  const generateReport = async () => {
    if (!userProfile?.company_id) return;
    
    setLoading(true);
    toast.info('Generating new packaging intelligence report...');
    
    try {
      const { error } = await supabase.functions.invoke('generate-packaging-intelligence', {
        body: { company_id: userProfile.company_id }
      });

      if (error) throw error;
      
      // Refetch the report after generation
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a second for DB to update
      await fetchLatestReport();
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestReport = async () => {
    if (!userProfile?.company_id) {
      console.log('PackagingIntelligenceDashboard: No user profile or company_id found:', { 
        userProfile, 
        company_id: userProfile?.company_id 
      });
      return;
    }

    console.log('PackagingIntelligenceDashboard: Fetching report for company:', userProfile.company_id);

    try {
      const { data, error } = await supabase
        .from('packaging_intelligence_reports')
        .select('id, generated_at, total_orders_analyzed, potential_savings, top_5_most_used_boxes, top_5_box_discrepancies, inventory_suggestions, projected_packaging_need, report_data')
        .eq('company_id', userProfile.company_id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('PackagingIntelligenceDashboard: Report query result:', { data, error });

      if (error) {
        console.error('Error fetching report:', error);
        return;
      }

      if (data) {
        // Check if the report has the new structure
        const discrepancies = data.top_5_box_discrepancies as any;
        const hasNewStructure = discrepancies && 
          Array.isArray(discrepancies) &&
          discrepancies.length > 0 &&
          discrepancies[0].master_box_sku !== undefined;

        // If old structure detected, regenerate the report
        if (discrepancies && 
            Array.isArray(discrepancies) &&
            discrepancies.length > 0 && 
            !hasNewStructure) {
          console.log('Old report structure detected, regenerating...');
          toast.info('Updating report to new format...');
          await generateReport();
          return;
        }

        setReport(data as PackagingReport);
        console.log('PackagingIntelligenceDashboard: Report set:', data);
      } else {
        setReport(null);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    }
  };

  const fetchLowStockBoxes = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('boxes')
        .select('id, name, sku, in_stock, min_stock, max_stock')
        .eq('company_id', userProfile.company_id)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching boxes:', error);
        return;
      }

      // Filter boxes within 20 units of minimum
      const lowStock = (data || []).filter(box => 
        box.in_stock <= (box.min_stock + 20)
      );

      // Sort by most critical (lowest current/min ratio) to least critical
      lowStock.sort((a, b) => {
        const ratioA = a.in_stock / Math.max(a.min_stock, 1);
        const ratioB = b.in_stock / Math.max(b.min_stock, 1);
        return ratioA - ratioB;
      });

      setLowStockBoxes(lowStock);
    } catch (error) {
      console.error('Error fetching low stock boxes:', error);
    }
  };

  const handleAddBoxToInventory = async (opportunity: any) => {
    if (!onAddToInventory) return;
    
    setAddingBoxSku(opportunity.master_box_sku);
    
    try {
      // Fetch full box details from packaging_master_list
      const { data: masterBox, error } = await supabase
        .from('packaging_master_list')
        .select('*')
        .eq('vendor_sku', opportunity.master_box_sku)
        .single();

      if (error || !masterBox) {
        toast.error('Could not find box details in master list');
        setAddingBoxSku(null);
        return;
      }

      // Map packaging_master_list fields to box data
      const boxData = {
        name: masterBox.name,
        sku: masterBox.vendor_sku,
        length: Number(masterBox.length_in),
        width: Number(masterBox.width_in),
        height: Number(masterBox.height_in),
        cost: Number(masterBox.cost),
        box_type: (masterBox.type || 'box') as 'box' | 'poly_bag' | 'envelope' | 'tube' | 'custom',
        max_weight: 50, // Default max weight
        in_stock: 0,
        min_stock: 10,
        max_stock: 100,
      };

      onAddToInventory(boxData);
    } catch (error) {
      console.error('Error fetching box details:', error);
      toast.error('Failed to load box details');
    } finally {
      setAddingBoxSku(null);
    }
  };


  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchLatestReport(), fetchLowStockBoxes()]);
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
          <p className="text-muted-foreground">Real shipment performance analysis and cost optimization insights</p>
        </div>
        <Button
          onClick={generateReport}
          disabled={loading || !userProfile?.company_id}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Report
        </Button>
      </div>

      {/* Low Inventory Alerts */}
      {lowStockBoxes.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Bell className="h-5 w-5" />
              Low Inventory Alerts ({lowStockBoxes.length})
            </CardTitle>
            <CardDescription>Boxes within 20 units of minimum stock level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStockBoxes.map((box) => {
              const stockDifference = box.in_stock - box.min_stock;
              const severity = 
                stockDifference <= 0 ? 'critical' : 
                stockDifference <= 5 ? 'high' : 
                stockDifference <= 10 ? 'medium' : 'low';
              const progress = Math.max(0, Math.min(100, (box.in_stock / (box.min_stock + 20)) * 100));
              
              return (
                <div key={box.id} className={`p-3 border rounded-lg bg-white ${
                  severity === 'critical' ? 'border-red-300' :
                  severity === 'high' ? 'border-orange-300' :
                  severity === 'medium' ? 'border-yellow-300' :
                  'border-gray-300'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span className="font-medium">{box.name || box.sku}</span>
                    </div>
                    <Badge 
                      variant={
                        severity === 'critical' ? 'destructive' : 
                        severity === 'low' ? 'secondary' :
                        'warning'
                      }
                      className={
                        severity === 'high' ? 'bg-orange-500 text-white hover:bg-orange-600' :
                        severity === 'medium' ? 'bg-yellow-500 text-black hover:bg-yellow-600' :
                        ''
                      }
                    >
                      {severity === 'critical' ? 'CRITICAL' : 
                       severity === 'high' ? 'HIGH' : 
                       severity === 'medium' ? 'MEDIUM' :
                       'LOW'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Current: <strong>{box.in_stock}</strong> units</span>
                      <span>Min: <strong>{box.min_stock}</strong></span>
                      <span>Reorder up to: <strong>{box.max_stock}</strong></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {!report ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Intelligence Report Available</h3>
            <p className="text-muted-foreground mb-4">
              Reports are generated automatically when you create shipments. Create some shipments to see your packaging intelligence insights.
            </p>
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
                    <p className="text-sm font-medium text-muted-foreground">Avg Utilization</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {report.report_data?.average_actual_utilization 
                        ? `${report.report_data.average_actual_utilization}%` 
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
                    <p className="text-sm font-medium text-muted-foreground">Shipments Analyzed</p>
                    <p className="text-2xl font-bold text-muted-foreground">
                      {report.report_data?.shipments_with_packaging_data || 0}
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
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Top Packaging Opportunities
                </CardTitle>
                <CardDescription>
                  Optimal new box sizes to add to your inventory for higher utilization
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!Array.isArray(report.top_5_box_discrepancies) || report.top_5_box_discrepancies.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No optimization opportunities found. Your packaging choices look efficient!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {report.top_5_box_discrepancies.map((opportunity: any, index: number) => {
                      const priority = opportunity.shipment_count >= 10 ? 'HIGH' : 
                                     opportunity.shipment_count >= 5 ? 'MEDIUM' : 'LOW';
                      const priorityColor = priority === 'HIGH' ? 'destructive' : 
                                          priority === 'MEDIUM' ? 'secondary' : 'default';
                      
                      return (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">#{index + 1}</Badge>
                              <span className="font-medium text-sm">
                                {opportunity.master_box_name}
                              </span>
                            </div>
                            <Badge variant={priorityColor}>
                              {priority}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                              <Package className="h-3 w-3" />
                              <strong>SKU:</strong> {opportunity.master_box_sku}
                            </div>
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-3 w-3" />
                              <strong>Shipments:</strong> {opportunity.shipment_count} would benefit
                            </div>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-3 w-3" />
                              <strong>Avg Utilization:</strong> {opportunity.avg_new_utilization}% 
                              <span className="text-green-600">(vs {opportunity.avg_current_utilization}% current)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-3 w-3" />
                              <strong>Potential Savings:</strong> ${opportunity.total_savings?.toFixed(2)}
                            </div>
                          </div>
                          {onAddToInventory && (
                            <div className="flex justify-end pt-2 mt-2 border-t">
                              <Button
                                size="sm"
                                onClick={() => handleAddBoxToInventory(opportunity)}
                                disabled={addingBoxSku === opportunity.master_box_sku}
                              >
                                <Plus className="mr-1 h-4 w-4" />
                                {addingBoxSku === opportunity.master_box_sku ? 'Loading...' : 'Add to Inventory'}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                   High-volume packaging from recent shipments and analysis
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
                          {box.percentage_of_shipments}% of orders
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
        </>
      )}
    </div>
  );
};
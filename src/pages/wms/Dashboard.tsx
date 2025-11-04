import { Card } from "@/components/ui/card";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Package, ClipboardCheck, Warehouse, TrendingUp, ListChecks, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function WmsDashboard() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  const { data: metrics } = useQuery({
    queryKey: ['wms-metrics', companyId],
    queryFn: async () => {
      const [
        { count: pendingReceiving },
        { count: pendingQc },
        { count: activePicks },
        { count: lowStockItems },
      ] = await Promise.all([
        (supabase as any).from('purchase_orders').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'pending'),
        (supabase as any).from('qc_inspections').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        (supabase as any).from('pick_lists').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
        (supabase as any).from('inventory_levels').select('*', { count: 'exact', head: true }).eq('company_id', companyId).lt('quantity_available', 10),
      ]);

      return {
        pendingReceiving: pendingReceiving || 0,
        pendingQc: pendingQc || 0,
        activePicks: activePicks || 0,
        lowStockItems: lowStockItems || 0,
      };
    },
    enabled: !!companyId,
  });

  const stats = [
    {
      title: "Pending Receiving",
      value: metrics?.pendingReceiving || 0,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      link: "/wms/receiving",
    },
    {
      title: "QC Inspections",
      value: metrics?.pendingQc || 0,
      icon: ClipboardCheck,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      link: "/wms/quality",
    },
    {
      title: "Active Picks",
      value: metrics?.activePicks || 0,
      icon: ListChecks,
      color: "text-green-600",
      bgColor: "bg-green-50",
      link: "/wms/picking",
    },
    {
      title: "Low Stock Alerts",
      value: metrics?.lowStockItems || 0,
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      link: "/wms/inventory",
    },
  ];

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">WMS Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Warehouse Management System - Real-time operations overview
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <a href={stat.link} className="block">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-bold mt-2">{stat.value}</p>
                    </div>
                    <div className={`${stat.bgColor} p-3 rounded-lg`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </a>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Warehouse className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Quick Actions</h2>
            </div>
            <div className="space-y-2">
              <a href="/wms/receiving" className="block p-3 rounded-lg hover:bg-accent transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Start Receiving Session</span>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              </a>
              <a href="/wms/picking" className="block p-3 rounded-lg hover:bg-accent transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Create Pick Wave</span>
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                </div>
              </a>
              <a href="/wms/inventory" className="block p-3 rounded-lg hover:bg-accent transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Adjust Inventory</span>
                  <Warehouse className="h-4 w-4 text-muted-foreground" />
                </div>
              </a>
              <a href="/wms/quality" className="block p-3 rounded-lg hover:bg-accent transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">QC Inspection</span>
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                </div>
              </a>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Performance Summary</h2>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Receiving Efficiency</span>
                  <span className="font-semibold">92%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: '92%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Pick Accuracy</span>
                  <span className="font-semibold">98%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: '98%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">QC Pass Rate</span>
                  <span className="font-semibold">95%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: '95%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Inventory Accuracy</span>
                  <span className="font-semibold">99%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500" style={{ width: '99%' }} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </TmsLayout>
  );
}

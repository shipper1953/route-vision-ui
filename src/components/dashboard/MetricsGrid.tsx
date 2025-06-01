
import { StatCard } from "./StatCard";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { Package, Truck, CheckCircle, Clock, Target, DollarSign } from "lucide-react";

export const MetricsGrid = () => {
  const metrics = useDashboardMetrics();

  if (metrics.loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Total Orders"
        value={metrics.totalOrders.toString()}
        icon={<Package className="h-4 w-4" />}
        trend={{
          value: `${metrics.totalOrders > 0 ? '+' : ''}${metrics.totalOrders}`,
          positive: metrics.totalOrders > 0
        }}
      />
      <StatCard
        title="Active Shipments"
        value={metrics.activeShipments.toString()}
        icon={<Truck className="h-4 w-4" />}
        trend={{
          value: `${metrics.activeShipments > 0 ? '+' : ''}${metrics.activeShipments}`,
          positive: metrics.activeShipments > 0
        }}
      />
      <StatCard
        title="Delivered Today"
        value={metrics.deliveredToday.toString()}
        icon={<CheckCircle className="h-4 w-4" />}
        trend={{
          value: `${metrics.deliveredToday > 0 ? '+' : ''}${metrics.deliveredToday}`,
          positive: metrics.deliveredToday > 0
        }}
      />
      <StatCard
        title="On Time Delivery Rate"
        value={`${metrics.onTimeDeliveryRate}%`}
        icon={<Target className="h-4 w-4" />}
        trend={{
          value: `${metrics.onTimeDeliveryRate}%`,
          positive: metrics.onTimeDeliveryRate >= 90
        }}
      />
      <StatCard
        title="Orders To Ship"
        value={metrics.ordersToShip.toString()}
        icon={<Clock className="h-4 w-4" />}
        trend={{
          value: `${metrics.ordersToShip} pending`,
          positive: metrics.ordersToShip < 5
        }}
      />
      <StatCard
        title="Total Revenue"
        value={`$${metrics.totalRevenue.toLocaleString()}`}
        icon={<DollarSign className="h-4 w-4" />}
        trend={{
          value: `$${metrics.totalRevenue.toLocaleString()}`,
          positive: metrics.totalRevenue > 0
        }}
      />
    </div>
  );
};

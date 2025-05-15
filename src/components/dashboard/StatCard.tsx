
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string | number;
    positive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn("tms-stat-card", className)}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="tms-stat-label">{title}</h3>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="flex items-end justify-between">
        <div className="tms-stat-value">{value}</div>
        {trend && (
          <div className={cn(
            "text-xs font-medium flex items-center",
            trend.positive ? "text-tms-teal" : "text-destructive"
          )}>
            {trend.positive ? "↑" : "↓"} {trend.value}
          </div>
        )}
      </div>
    </div>
  );
}

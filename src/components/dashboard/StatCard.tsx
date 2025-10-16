
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string | number;
    positive: boolean;
  };
  className?: string;
  linkTo?: string;
}

export function StatCard({ title, value, icon, trend, className, linkTo }: StatCardProps) {
  const valueContent = (
    <div className="tms-stat-value">
      {value}
    </div>
  );

  return (
    <div className={cn("tms-stat-card", className)}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="tms-stat-label">{title}</h3>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="flex items-end justify-between">
        {linkTo ? (
          <Link to={linkTo} className="hover:text-primary transition-colors">
            {valueContent}
          </Link>
        ) : (
          valueContent
        )}
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


import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardCharts } from '@/hooks/useDashboardCharts';

const COLORS = ['#0d9488', '#f59e0b', '#1a365d'];

const CARRIER_COLORS: { [key: string]: string } = {
  'USPS': '#0d9488',
  'FedExDefault': '#f59e0b',
  'UPSDAP': '#8b5cf6',
  'UPS': '#8b5cf6',
  'FedEx': '#f59e0b',
  'Unknown': '#9CA3AF',
};

const getCarrierColor = (carrier: string, index: number): string => {
  if (CARRIER_COLORS[carrier]) return CARRIER_COLORS[carrier];
  const fallbackColors = ['#1a365d', '#ef4444', '#10b981', '#f97316', '#6366f1'];
  return fallbackColors[index % fallbackColors.length];
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomParcelTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const dataPoint = payload[0]?.payload;
  if (!dataPoint || !dataPoint.carrierDetails) return null;

  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-4 max-w-sm">
      <p className="font-semibold text-sm mb-3">{label}</p>
      
      {payload.map((entry, index) => {
        const carrier = entry.name;
        const count = entry.value;
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
        const services = dataPoint.carrierDetails[carrier] || [];
        
        return (
          <div key={index} className="mb-3 last:mb-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="font-medium text-sm">{carrier}</span>
              </div>
              <span className="text-sm font-semibold">
                {count} ({percentage}%)
              </span>
            </div>
            
            {services.length > 0 && (
              <div className="ml-5 mt-1 space-y-0.5">
                {services.map((svc: any, svcIndex: number) => {
                  const svcPercentage = count > 0 
                    ? ((svc.count / count) * 100).toFixed(0) 
                    : '0';
                  return (
                    <div 
                      key={svcIndex} 
                      className="flex justify-between text-xs text-muted-foreground"
                    >
                      <span className="truncate max-w-[180px]">{svc.service}</span>
                      <span className="ml-2 whitespace-nowrap">
                        {svc.count} ({svcPercentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      
      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex justify-between text-sm font-semibold">
          <span>Total:</span>
          <span>{total} parcels</span>
        </div>
      </div>
    </div>
  );
};

export function ShipmentsChart() {
  const { parcelData, loading, carriers } = useDashboardCharts();

  if (loading) {
    return (
      <div className="tms-card h-full flex flex-col">
        <h3 className="tms-section-title">Parcel Volume by Carrier</h3>
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-[350px] w-full" />
        </div>
      </div>
    );
  }

  if (parcelData.length === 0) {
    return (
      <div className="tms-card h-full flex flex-col">
        <h3 className="tms-section-title">Parcel Volume by Carrier</h3>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No shipment data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tms-card h-full flex flex-col">
      <h3 className="tms-section-title">Parcel Volume by Carrier</h3>
      <div className="flex-1 min-h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={parcelData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '14px' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '14px' }}
              label={{ value: 'Parcels', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomParcelTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
            
            {carriers && carriers.map((carrier, index) => (
              <Bar 
                key={carrier}
                dataKey={carrier} 
                stackId="a" 
                fill={getCarrierColor(carrier, index)}
                radius={index === carriers.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DeliveryPerformanceChart() {
  const { carrierData, loading } = useDashboardCharts();

  if (loading) {
    return (
      <div className="tms-card h-full flex flex-col">
        <h3 className="tms-section-title">Carrier Performance</h3>
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-[250px] w-full" />
        </div>
      </div>
    );
  }

  if (carrierData.length === 0 || carrierData.every(d => d.value === 0)) {
    return (
      <div className="tms-card h-full flex flex-col">
        <h3 className="tms-section-title">Carrier Performance</h3>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No delivery data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tms-card h-full flex flex-col">
      <h3 className="tms-section-title">Carrier Performance</h3>
      <div className="flex-1 flex justify-center min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={carrierData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {carrierData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


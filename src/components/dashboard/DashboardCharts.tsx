
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardCharts } from '@/hooks/useDashboardCharts';

const COLORS = ['#0d9488', '#f59e0b', '#1a365d'];

export function ShipmentsChart() {
  const { parcelData, loading } = useDashboardCharts();

  if (loading) {
    return (
      <div className="tms-card h-full flex flex-col">
        <h3 className="tms-section-title">Parcel Volume</h3>
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-[250px] w-full" />
        </div>
      </div>
    );
  }

  if (parcelData.length === 0) {
    return (
      <div className="tms-card h-full flex flex-col">
        <h3 className="tms-section-title">Parcel Volume</h3>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No shipment data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tms-card h-full flex flex-col">
      <h3 className="tms-section-title">Parcel Volume</h3>
      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={parcelData}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip />
            <Area type="monotone" dataKey="parcels" stroke="#1a365d" fill="#d0dcea" />
          </AreaChart>
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

export function DashboardCharts() {
  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      <ShipmentsChart />
      <DeliveryPerformanceChart />
    </div>
  );
}

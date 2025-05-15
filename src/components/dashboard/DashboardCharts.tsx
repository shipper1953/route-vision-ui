
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { cn } from '@/lib/utils';

// Data for the charts
const monthlyData = [
  { month: 'Jan', shipments: 65 },
  { month: 'Feb', shipments: 59 },
  { month: 'Mar', shipments: 80 },
  { month: 'Apr', shipments: 81 },
  { month: 'May', shipments: 56 },
  { month: 'Jun', shipments: 55 },
  { month: 'Jul', shipments: 40 },
];

const deliveryPerformance = [
  { name: 'On Time', value: 68 },
  { name: 'Delayed', value: 23 },
  { name: 'Early', value: 9 },
];

const COLORS = ['#0d9488', '#f59e0b', '#1a365d'];

export function ShipmentsChart() {
  return (
    <div className="tms-card h-full flex flex-col">
      <h3 className="tms-section-title">Shipments Overview</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={monthlyData}
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
            <Area type="monotone" dataKey="shipments" stroke="#1a365d" fill="#d0dcea" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DeliveryPerformanceChart() {
  return (
    <div className="tms-card h-full flex flex-col">
      <h3 className="tms-section-title">Delivery Performance</h3>
      <div className="flex-1 flex justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={deliveryPerformance}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {deliveryPerformance.map((entry, index) => (
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

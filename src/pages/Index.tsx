
import { Package, Truck, Clock, DollarSign } from "lucide-react";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ShipmentCard } from "@/components/dashboard/ShipmentCard";
import { ShipmentsChart, DeliveryPerformanceChart } from "@/components/dashboard/DashboardCharts";
import { Button } from "@/components/ui/button";

// Sample shipment data
const recentShipments = [
  {
    id: "SH-1234",
    title: "Construction Materials",
    origin: "Boston, MA",
    destination: "New York, NY",
    date: "May 15, 2025",
    status: "in_transit" as const,
    client: "ABC Construction",
  },
  {
    id: "SH-1235",
    title: "Electronics Package",
    origin: "San Francisco, CA",
    destination: "Los Angeles, CA",
    date: "May 14, 2025",
    status: "delivered" as const,
    client: "Tech Solutions Inc",
  },
  {
    id: "SH-1236",
    title: "Medical Supplies",
    origin: "Chicago, IL",
    destination: "Detroit, MI",
    date: "May 16, 2025",
    status: "pending" as const,
    client: "MediCorp",
  },
];

const Index = () => {
  return (
    <TmsLayout>
      <div className="animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-tms-blue">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your transportation operations</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-3">
            <Button className="bg-tms-blue hover:bg-tms-blue-400">
              <Package className="mr-2 h-4 w-4" /> New Shipment
            </Button>
            <Button variant="outline">View Reports</Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Active Shipments" 
            value="128" 
            icon={<Package />} 
            trend={{ value: "12%", positive: true }}
          />
          <StatCard 
            title="Fleet Utilization" 
            value="86%" 
            icon={<Truck />} 
            trend={{ value: "4%", positive: true }}
          />
          <StatCard 
            title="On-Time Delivery" 
            value="92%" 
            icon={<Clock />} 
            trend={{ value: "3%", positive: false }}
          />
          <StatCard 
            title="Revenue (MTD)" 
            value="$143,500" 
            icon={<DollarSign />} 
            trend={{ value: "8%", positive: true }}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 h-64">
            <ShipmentsChart />
          </div>
          <div className="h-64">
            <DeliveryPerformanceChart />
          </div>
        </div>

        {/* Recent Shipments */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="tms-section-title">Recent Shipments</h2>
            <Button variant="ghost" className="text-tms-blue hover:text-tms-blue-400">
              View All
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentShipments.map((shipment) => (
              <ShipmentCard key={shipment.id} shipment={shipment} />
            ))}
          </div>
        </div>
      </div>
    </TmsLayout>
  );
};

export default Index;

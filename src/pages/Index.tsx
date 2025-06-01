
import { useAuth } from "@/context";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { StatCard } from "@/components/dashboard/StatCard";
import { ShipmentCard } from "@/components/dashboard/ShipmentCard";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tms-navy mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your transportation management system
          </p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Orders"
            value="24"
            change="+12%"
            changeType="positive"
          />
          <StatCard
            title="Active Shipments"
            value="18"
            change="+8%"
            changeType="positive"
          />
          <StatCard
            title="Delivered Today"
            value="6"
            change="+2"
            changeType="positive"
          />
          <StatCard
            title="Pending Pickups"
            value="3"
            change="-1"
            changeType="negative"
          />
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4">
            <DashboardCharts />
          </div>
          <div className="col-span-3">
            <ShipmentCard />
          </div>
        </div>
      </div>
    </TmsLayout>
  );
};

export default Index;

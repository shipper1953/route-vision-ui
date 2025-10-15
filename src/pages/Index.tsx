
import { useAuth } from "@/hooks/useAuth";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { ShipmentsChart, DeliveryPerformanceChart } from "@/components/dashboard/DashboardCharts";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { BoxOpportunitiesCard } from "@/components/dashboard/BoxOpportunitiesCard";
import { OrdersToShipCard } from "@/components/dashboard/OrdersToShipCard";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('User not authenticated, redirecting to login...');
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
        <DashboardHeader />
        
        <MetricsGrid />

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ShipmentsChart />
          </div>
          <DeliveryPerformanceChart />
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <BoxOpportunitiesCard />
          <OrdersToShipCard />
        </div>
      </div>
    </TmsLayout>
  );
};

export default Index;

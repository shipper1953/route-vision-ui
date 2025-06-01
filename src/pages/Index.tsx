
import { useAuth } from "@/context";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { ShipmentCard } from "@/components/dashboard/ShipmentCard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
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

  // Sample shipment data for the ShipmentCard
  const sampleShipment = {
    id: "SHP-001",
    title: "Package to New York",
    origin: "Boston, MA",
    destination: "New York, NY",
    date: "2025-06-01",
    status: "in_transit" as const,
    client: "Acme Corp"
  };

  return (
    <TmsLayout>
      <div className="space-y-6">
        <DashboardHeader />
        
        <MetricsGrid />

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4">
            <DashboardCharts />
          </div>
          <div className="col-span-3">
            <ShipmentCard shipment={sampleShipment} />
          </div>
        </div>
      </div>
    </TmsLayout>
  );
};

export default Index;

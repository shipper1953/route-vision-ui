
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { ShipmentsHeader } from "@/components/shipment/ShipmentsHeader";
import { ShipmentsSearch } from "@/components/shipment/ShipmentsSearch";
import { ShipmentsTable } from "@/components/shipment/ShipmentsTable";
import { useShipmentData } from "@/hooks/useShipmentData";

const Shipments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();
  const { shipments, loading } = useShipmentData();
  
  // Get recently added shipment from URL parameters
  const urlParams = new URLSearchParams(location.search);
  const highlightedShipment = urlParams.get('highlight');
  
  const filteredShipments = shipments.filter(shipment => 
    shipment.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    shipment.tracking.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (shipment.carrier && shipment.carrier.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <TmsLayout>
      <ShipmentsHeader />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>All Parcels</CardTitle>
            <ShipmentsSearch 
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          </div>
          <CardDescription>
            {loading ? "Loading shipments..." : `Showing ${filteredShipments.length} of ${shipments.length} shipments`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShipmentsTable 
            shipments={shipments}
            loading={loading}
            filteredShipments={filteredShipments}
            highlightedShipment={highlightedShipment}
          />
        </CardContent>
      </Card>
    </TmsLayout>
  );
};

export default Shipments;

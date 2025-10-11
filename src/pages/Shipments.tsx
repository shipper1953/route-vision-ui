
import { useEffect } from "react";
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
import { ShipmentsPagination } from "@/components/shipment/ShipmentsPagination";
import { usePaginatedShipments } from "@/hooks/usePaginatedShipments";
import { toast } from "sonner";

const Shipments = () => {
  const {
    shipments,
    loading,
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    searchTerm,
    setSearchTerm,
    goToPage,
    nextPage,
    previousPage
  } = usePaginatedShipments();
  
  const location = useLocation();
  
  // Get recently added shipment from URL parameters
  const urlParams = new URLSearchParams(location.search);
  const highlightedShipment = urlParams.get('highlight');
  
  // Log when highlighted shipment changes
  useEffect(() => {
    if (highlightedShipment) {
      console.log("Highlighting shipment:", highlightedShipment);
    }
  }, [highlightedShipment]);
  
  // Show toast when a shipment is highlighted
  useEffect(() => {
    if (highlightedShipment && shipments.length > 0) {
      const foundShipment = shipments.find(s => s.id === highlightedShipment);
      if (foundShipment) {
        toast.success(`Showing shipment ${foundShipment.id}`);
      }
    }
  }, [highlightedShipment, shipments]);

  const startShipment = ((currentPage - 1) * pageSize) + 1;
  const endShipment = Math.min(currentPage * pageSize, totalCount);

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
            {loading ? "Loading shipments..." : `Showing ${startShipment}-${endShipment} of ${totalCount} shipments`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShipmentsTable 
            shipments={shipments}
            loading={loading}
            filteredShipments={shipments}
            highlightedShipment={highlightedShipment}
          />
          {totalCount > pageSize && (
            <ShipmentsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
              onPageChange={goToPage}
              onNextPage={nextPage}
              onPreviousPage={previousPage}
              loading={loading}
            />
          )}
        </CardContent>
      </Card>
    </TmsLayout>
  );
};

export default Shipments;

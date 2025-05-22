
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Package, CalendarDays, FileDown, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { ShipmentStatus } from "./ShipmentStatus";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ShippingLabelDialog } from "./ShippingLabelDialog";

export interface Shipment {
  id: string;  // Changed to string only
  tracking: string;
  carrier: string;
  carrierUrl: string;
  service: string;
  origin: string;
  destination: string;
  shipDate: string;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  status: string;
  weight: string;
  labelUrl?: string;
}

interface ShipmentsTableProps {
  shipments: Shipment[];
  loading: boolean;
  filteredShipments: Shipment[];
  highlightedShipment: string | null;
}

export const ShipmentsTable = ({ 
  shipments,
  loading, 
  filteredShipments, 
  highlightedShipment 
}: ShipmentsTableProps) => {
  // State for the shipping label dialog
  const [selectedLabelUrl, setSelectedLabelUrl] = useState<string | undefined>(undefined);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('');
  const [isLabelDialogOpen, setIsLabelDialogOpen] = useState(false);
  
  const openLabelDialog = (shipmentId: string, labelUrl?: string) => {
    if (!labelUrl) {
      toast.error("Label URL not available");
      return;
    }
    
    setSelectedLabelUrl(labelUrl);
    setSelectedShipmentId(shipmentId);
    setIsLabelDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner size={24} />
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Shipment</TableHead>
            <TableHead>Tracking</TableHead>
            <TableHead>Carrier</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Ship Date</TableHead>
            <TableHead>Est. Delivery</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredShipments.map((shipment) => (
            <TableRow 
              key={shipment.id} 
              className={highlightedShipment === shipment.id ? "bg-blue-50" : ""}
            >
              <TableCell className="font-medium">{shipment.id}</TableCell>
              <TableCell>
                {shipment.tracking !== 'Pending' ? (
                  <a 
                    href={shipment.carrierUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-tms-blue hover:underline"
                  >
                    {shipment.tracking}
                    <LinkIcon className="ml-1 h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">Pending</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>{shipment.carrier}</span>
                </div>
              </TableCell>
              <TableCell>{shipment.weight}</TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{shipment.origin}</div>
                  <div className="text-muted-foreground">to {shipment.destination}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <CalendarDays className="mr-1 h-3 w-3 text-muted-foreground" />
                  {shipment.shipDate}
                </div>
              </TableCell>
              <TableCell>{shipment.estimatedDelivery || "Not available"}</TableCell>
              <TableCell>
                <ShipmentStatus status={shipment.status} />
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-2"
                    onClick={() => openLabelDialog(shipment.id, shipment.labelUrl)}
                    disabled={!shipment.labelUrl}
                  >
                    <FileDown className="h-4 w-4" />
                    <span className="sr-only md:not-sr-only md:ml-1">Label</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          
          {filteredShipments.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No shipments found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      {/* Label Dialog */}
      <ShippingLabelDialog
        isOpen={isLabelDialogOpen}
        onClose={() => setIsLabelDialogOpen(false)}
        labelUrl={selectedLabelUrl}
        shipmentId={selectedShipmentId}
      />
    </>
  );
};


import { useState } from "react";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Sample data - would be fetched from API in production
const shipments = [
  { 
    id: "SHP-1234", 
    tracking: "EZ1234567890", 
    carrier: "USPS",
    service: "Priority Mail",
    origin: "Boston, MA",
    destination: "New York, NY",
    date: "May 15, 2025", 
    status: "in_transit"
  },
  { 
    id: "SHP-1235", 
    tracking: "EZ2345678901", 
    carrier: "UPS",
    service: "Ground",
    origin: "Chicago, IL",
    destination: "Milwaukee, WI",
    date: "May 14, 2025", 
    status: "delivered"
  },
  { 
    id: "SHP-1236", 
    tracking: "EZ3456789012", 
    carrier: "FedEx",
    service: "Express",
    origin: "Los Angeles, CA",
    destination: "San Francisco, CA",
    date: "May 14, 2025", 
    status: "created"
  },
  { 
    id: "SHP-1237", 
    tracking: "EZ4567890123", 
    carrier: "DHL",
    service: "International",
    origin: "New York, NY",
    destination: "London, UK",
    date: "May 13, 2025", 
    status: "in_transit"
  }
];

const ShipmentStatus = ({ status }: { status: string }) => {
  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'created':
        return { label: 'Created', variant: 'outline' };
      case 'in_transit':
        return { label: 'In Transit', variant: 'default' };
      case 'out_for_delivery':
        return { label: 'Out for Delivery', variant: 'warning' };
      case 'delivered':
        return { label: 'Delivered', variant: 'success' };
      case 'exception':
        return { label: 'Exception', variant: 'destructive' };
      default:
        return { label: status, variant: 'outline' };
    }
  };

  const { label, variant } = getStatusDetails(status);
  return <Badge variant={variant as any}>{label}</Badge>;
};

const Shipments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  
  const filteredShipments = shipments.filter(shipment => 
    shipment.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    shipment.tracking.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shipment.carrier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <TmsLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tms-blue">Shipments</h1>
          <p className="text-muted-foreground">Track and manage your shipments</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          <Button 
            className="bg-tms-blue hover:bg-tms-blue-400"
            onClick={() => navigate('/create-shipment')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Shipment
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>All Shipments</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search shipments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <CardDescription>
            Showing {filteredShipments.length} of {shipments.length} shipments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShipments.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell className="font-medium">{shipment.id}</TableCell>
                  <TableCell>{shipment.tracking}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span>{shipment.carrier}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{shipment.origin}</div>
                      <div className="text-muted-foreground">to {shipment.destination}</div>
                    </div>
                  </TableCell>
                  <TableCell>{shipment.date}</TableCell>
                  <TableCell>
                    <ShipmentStatus status={shipment.status} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">Details</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TmsLayout>
  );
};

export default Shipments;

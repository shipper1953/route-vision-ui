import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
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
import { Box, Search, Plus, Package, CalendarDays, FileDown, Link as LinkIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

// Define the shipment type with all the properties we need
interface Shipment {
  id: string;
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

// Sample data as fallback
const sampleShipments: Shipment[] = [
  { 
    id: "SHP-1234", 
    tracking: "EZ1234567890", 
    carrier: "USPS",
    carrierUrl: "https://tools.usps.com/go/TrackConfirmAction?tLabels=EZ1234567890",
    service: "Priority Mail",
    origin: "Boston, MA",
    destination: "New York, NY",
    shipDate: "May 15, 2025",
    estimatedDelivery: "May 17, 2025", 
    actualDelivery: null,
    status: "in_transit",
    weight: "1.2 lbs"
  },
  { 
    id: "SHP-1235", 
    tracking: "EZ2345678901", 
    carrier: "UPS",
    carrierUrl: "https://www.ups.com/track?tracknum=EZ2345678901",
    service: "Ground",
    origin: "Chicago, IL",
    destination: "Milwaukee, WI",
    shipDate: "May 14, 2025",
    estimatedDelivery: "May 17, 2025", 
    actualDelivery: "May 16, 2025",
    status: "delivered",
    weight: "3.5 lbs"
  },
  { 
    id: "SHP-1236", 
    tracking: "EZ3456789012", 
    carrier: "FedEx",
    carrierUrl: "https://www.fedex.com/fedextrack/?trknbr=EZ3456789012",
    service: "Express",
    origin: "Los Angeles, CA",
    destination: "San Francisco, CA",
    shipDate: "May 14, 2025",
    estimatedDelivery: "May 15, 2025", 
    actualDelivery: null,
    status: "created",
    weight: "2.1 lbs"
  },
  { 
    id: "SHP-1237", 
    tracking: "EZ4567890123", 
    carrier: "DHL",
    carrierUrl: "https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=EZ4567890123",
    service: "International",
    origin: "New York, NY",
    destination: "London, UK",
    shipDate: "May 13, 2025",
    estimatedDelivery: "May 18, 2025", 
    actualDelivery: null,
    status: "in_transit",
    weight: "4.2 lbs"
  }
];

const ShipmentStatus = ({ status }: { status: string }) => {
  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'created':
        return { label: 'Label Created', variant: 'outline' };
      case 'in_transit':
        return { label: 'In Transit', variant: 'default' };
      case 'out_for_delivery':
        return { label: 'Out for Delivery', variant: 'warning' };
      case 'delivered':
        return { label: 'Delivered', variant: 'success' };
      case 'purchased':
        return { label: 'Label Purchased', variant: 'success' };
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
  const location = useLocation();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get recently added shipment from URL parameters
  const urlParams = new URLSearchParams(location.search);
  const highlightedShipment = urlParams.get('highlight');
  
  useEffect(() => {
    // Function to load shipments from Supabase or local storage
    const loadShipments = async () => {
      setLoading(true);
      try {
        // Try to get shipments from Supabase if authorized
        const { data: supabaseShipments, error } = await supabase
          .from('shipments')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error || !supabaseShipments?.length) {
          console.log("No shipments from Supabase, checking local storage");
          
          // Try to get from localStorage as fallback
          const localShipments = localStorage.getItem('shipments');
          if (localShipments) {
            setShipments(JSON.parse(localShipments));
          } else {
            // Use sample data if nothing else is available
            setShipments(sampleShipments);
          }
        } else {
          // Transform Supabase data to match our interface
          const formattedShipments = supabaseShipments.map(s => ({
            id: s.easypost_id || s.id,
            tracking: s.tracking_code || 'Pending',
            carrier: s.carrier || 'Unknown',
            carrierUrl: s.tracking_url || '#',
            service: s.service || 'Standard',
            origin: s.from_city ? `${s.from_city}, ${s.from_state}` : 'Unknown',
            destination: s.to_city ? `${s.to_city}, ${s.to_state}` : 'Unknown',
            shipDate: new Date(s.created_at).toLocaleDateString(),
            estimatedDelivery: s.estimated_delivery ? new Date(s.estimated_delivery).toLocaleDateString() : null,
            actualDelivery: s.delivered_at ? new Date(s.delivered_at).toLocaleDateString() : null,
            status: s.status || 'created',
            weight: `${s.weight || '0'} ${s.weight_unit || 'lbs'}`,
            labelUrl: s.label_url
          }));
          
          setShipments(formattedShipments);
          
          // Also save to localStorage for offline access
          localStorage.setItem('shipments', JSON.stringify(formattedShipments));
        }
      } catch (err) {
        console.error("Error loading shipments:", err);
        toast.error("Could not load shipments. Showing sample data instead.");
        
        // Fallback to sample data
        setShipments(sampleShipments);
      } finally {
        setLoading(false);
      }
    };
    
    loadShipments();
  }, []);
  
  // Add the most recently purchased shipment to top of list if not in database yet
  useEffect(() => {
    const purchasedLabel = sessionStorage.getItem('lastPurchasedLabel');
    
    if (purchasedLabel) {
      try {
        const labelData = JSON.parse(purchasedLabel);
        
        // Check if this shipment is already in our list
        const exists = shipments.some(s => s.id === labelData.id);
        
        if (!exists && labelData.id) {
          // Create a new shipment entry from the label data
          const newShipment: Shipment = {
            id: labelData.id,
            tracking: labelData.tracking_code || 'Pending',
            carrier: labelData.selected_rate?.carrier || 'Unknown',
            carrierUrl: labelData.tracker?.public_url || '#',
            service: labelData.selected_rate?.service || 'Standard',
            origin: 'From address',
            destination: 'To address',
            shipDate: new Date().toLocaleDateString(),
            estimatedDelivery: null,
            actualDelivery: null,
            status: 'purchased',
            weight: `${labelData.parcel?.weight || '0'} oz`,
            labelUrl: labelData.postage_label?.label_url
          };
          
          // Add to the start of the list
          setShipments(prev => [newShipment, ...prev]);
          
          // Clear session storage to prevent duplicates
          sessionStorage.removeItem('lastPurchasedLabel');
        }
      } catch (err) {
        console.error("Error processing label data:", err);
      }
    }
  }, [shipments]);
  
  const filteredShipments = shipments.filter(shipment => 
    shipment.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    shipment.tracking.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (shipment.carrier && shipment.carrier.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const openLabel = (labelUrl?: string) => {
    if (!labelUrl) {
      toast.error("Label URL not available");
      return;
    }
    
    window.open(labelUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <TmsLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tms-blue">Parcel Shipments</h1>
          <p className="text-muted-foreground">Track and manage your EasyPost shipments</p>
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
            <CardTitle>All Parcels</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by tracking or carrier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <CardDescription>
            {loading ? "Loading shipments..." : `Showing ${filteredShipments.length} of ${shipments.length} shipments`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <LoadingSpinner size={24} />
            </div>
          ) : (
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
                          onClick={() => openLabel(shipment.labelUrl)}
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
          )}
        </CardContent>
      </Card>
    </TmsLayout>
  );
};

export default Shipments;

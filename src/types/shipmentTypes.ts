
import { Shipment } from "@/components/shipment/ShipmentsTable";

// Sample data as fallback
export const sampleShipments: Shipment[] = [
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

export interface ShipmentDataState {
  shipments: Shipment[];
  loading: boolean;
}


import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shipment } from "@/components/shipment/ShipmentsTable";

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

export const useShipmentData = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

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
            tracking: s.tracking_number || 'Pending',
            carrier: s.carrier || 'Unknown',
            carrierUrl: s.label_url || '#',
            service: s.carrier_service || 'Standard',
            origin: 'Origin',
            destination: 'Destination',
            shipDate: new Date(s.created_at).toLocaleDateString(),
            estimatedDelivery: s.estimated_delivery_date ? new Date(s.estimated_delivery_date).toLocaleDateString() : null,
            actualDelivery: s.actual_delivery_date ? new Date(s.actual_delivery_date).toLocaleDateString() : null,
            status: s.status || 'created',
            weight: `${s.weight || '0'} lbs`,
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

  // Handle recently purchased label from session storage
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

  return {
    shipments,
    loading
  };
};


import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shipment } from "@/components/shipment/ShipmentsTable";
import { fetchOrders } from "@/services/orderService";

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

  // Load shipments from Supabase, local storage, and orders
  useEffect(() => {
    const loadShipments = async () => {
      setLoading(true);
      try {
        // Try to get shipments from Supabase if authorized
        const { data: supabaseShipments, error } = await supabase
          .from('shipments')
          .select('*')
          .order('created_at', { ascending: false });
        
        console.log("Supabase shipments query result:", { data: supabaseShipments, error });
        
        // Get local storage shipments
        let localStorageShipments: Shipment[] = [];
        const storedShipments = localStorage.getItem('shipments');
        if (storedShipments) {
          try {
            localStorageShipments = JSON.parse(storedShipments);
            console.log("Found shipments in local storage:", localStorageShipments.length);
          } catch (err) {
            console.error("Error parsing local storage shipments:", err);
          }
        }
        
        // Get shipments from orders
        let orderShipments: Shipment[] = [];
        try {
          const orders = await fetchOrders();
          orderShipments = orders
            .filter(order => order.shipment)
            .map(order => ({
              id: order.shipment!.id,
              tracking: order.shipment!.trackingNumber,
              carrier: order.shipment!.carrier,
              carrierUrl: order.shipment!.trackingUrl,
              service: order.shipment!.service,
              origin: order.shippingAddress 
                ? `${order.shippingAddress.city}, ${order.shippingAddress.state}` 
                : "Unknown Origin",
              destination: "Destination",
              shipDate: order.orderDate,
              estimatedDelivery: order.shipment!.estimatedDeliveryDate || null,
              actualDelivery: order.shipment!.actualDeliveryDate || null,
              status: order.status,
              weight: order.parcelInfo ? `${order.parcelInfo.weight} oz` : "Unknown",
              labelUrl: order.shipment!.labelUrl
            }));
          console.log("Found shipments from orders:", orderShipments.length);
        } catch (err) {
          console.error("Error getting shipments from orders:", err);
        }
        
        if (error || !supabaseShipments?.length) {
          console.log("No shipments from Supabase, using local storage and order data");
          
          if (localStorageShipments.length > 0 || orderShipments.length > 0) {
            // Merge local storage shipments and order shipments
            setShipments(mergeShipments([], [...localStorageShipments, ...orderShipments]));
          } else {
            // Use sample data if nothing else is available
            console.log("No local shipments, using sample data");
            setShipments(sampleShipments);
          }
        } else {
          // Transform Supabase data to match our interface
          const formattedShipments: Shipment[] = supabaseShipments.map(s => ({
            id: s.easypost_id || String(s.id),
            tracking: s.tracking_number || 'Pending',
            carrier: s.carrier || 'Unknown',
            carrierUrl: s.tracking_number ? 
              `https://www.trackingmore.com/track/en/${s.tracking_number}` : '#',
            service: s.carrier_service || 'Standard',
            origin: s.origin_address ? 'Origin' : 'Unknown Origin',
            destination: s.destination_address ? 'Destination' : 'Unknown Destination',
            shipDate: new Date(s.created_at).toLocaleDateString(),
            estimatedDelivery: s.estimated_delivery_date ? 
              new Date(s.estimated_delivery_date).toLocaleDateString() : null,
            actualDelivery: s.actual_delivery_date ? 
              new Date(s.actual_delivery_date).toLocaleDateString() : null,
            status: s.status || 'created',
            weight: `${s.weight || '0'} lbs`,
            labelUrl: s.label_url
          }));
          
          // Merge with any local storage shipments and order shipments
          const mergedShipments = mergeShipments(formattedShipments, [...localStorageShipments, ...orderShipments]);
          setShipments(mergedShipments);
          
          // Update local storage with merged list
          localStorage.setItem('shipments', JSON.stringify(mergedShipments));
          console.log("Saved merged shipments to localStorage:", mergedShipments.length);
        }
      } catch (err) {
        console.error("Error loading shipments:", err);
        toast.error("Could not load shipments. Showing available data instead.");
        
        // Try to load from localStorage as fallback
        const storedShipments = localStorage.getItem('shipments');
        if (storedShipments) {
          try {
            setShipments(JSON.parse(storedShipments));
          } catch (parseErr) {
            // As a last resort, use sample data
            setShipments(sampleShipments);
          }
        } else {
          // Fallback to sample data
          setShipments(sampleShipments);
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadShipments();
  }, []);

  // Helper function to merge shipments from different sources
  const mergeShipments = (dbShipments: Shipment[], otherShipments: Shipment[]): Shipment[] => {
    // Create a map of existing shipments by ID for quick lookup
    const shipmentMap = new Map<string, Shipment>();
    
    // Add database shipments to the map
    dbShipments.forEach(shipment => {
      shipmentMap.set(shipment.id, shipment);
    });
    
    // Add other shipments if they don't exist in the database yet
    otherShipments.forEach(shipment => {
      if (!shipmentMap.has(shipment.id)) {
        shipmentMap.set(shipment.id, shipment);
      }
    });
    
    // Convert map back to array and sort by most recent first
    return Array.from(shipmentMap.values())
      .sort((a, b) => {
        // Simple date parsing for comparison
        const dateA = new Date(a.shipDate).getTime();
        const dateB = new Date(b.shipDate).getTime();
        return dateB - dateA; // Most recent first
      });
  };

  // Handle recently purchased label from session storage
  useEffect(() => {
    const purchasedLabel = sessionStorage.getItem('lastPurchasedLabel');
    
    if (purchasedLabel) {
      try {
        const labelData = JSON.parse(purchasedLabel);
        console.log("Found purchased label data:", labelData);
        
        // Check if this shipment is already in our list
        const exists = shipments.some(s => s.id === labelData.id);
        
        if (!exists && labelData.id) {
          // Create a new shipment entry from the label data
          const newShipment: Shipment = {
            id: labelData.id, // This is already a string from EasyPost
            tracking: labelData.tracking_number || 'Pending',
            carrier: labelData.selected_rate?.carrier || 'Unknown', 
            carrierUrl: labelData.tracker?.public_url || '#',
            service: labelData.selected_rate?.service || 'Standard',
            origin: labelData.from_address?.city + ', ' + labelData.from_address?.state || 'Origin',
            destination: labelData.to_address?.city + ', ' + labelData.to_address?.state || 'Destination',
            shipDate: new Date().toLocaleDateString(),
            estimatedDelivery: null,
            actualDelivery: null,
            status: 'purchased',
            weight: `${labelData.parcel?.weight || '0'} ${labelData.parcel?.weight_unit || 'oz'}`,
            labelUrl: labelData.postage_label?.label_url
          };
          
          console.log("Adding new shipment to list:", newShipment);
          
          // Create a new array with the new shipment at the beginning
          const updatedShipments = [newShipment, ...shipments];
          setShipments(updatedShipments);
          
          // Update localStorage to persist the new shipment
          localStorage.setItem('shipments', JSON.stringify(updatedShipments));
          
          // Show a toast notification about the new shipment
          toast.success("New shipment added to your shipments list");
          
          // Save to Supabase if possible
          saveShipmentToSupabase(labelData);
        }
        
        // Clear session storage to prevent duplicates on refresh
        // BUT only clear after we've successfully added the shipment
        sessionStorage.removeItem('lastPurchasedLabel');
      } catch (err) {
        console.error("Error processing label data:", err);
      }
    }
  }, [shipments]);

  // Function to save shipment to Supabase
  const saveShipmentToSupabase = async (labelData: any) => {
    try {
      if (!labelData) return;
      
      // Check if user is authenticated
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        console.log("User not authenticated, skipping database save");
        return;
      }

      // Format shipment data for Supabase
      const shipmentData = {
        easypost_id: labelData.id,
        tracking_number: labelData.tracking_number,
        carrier: labelData.selected_rate?.carrier,
        carrier_service: labelData.selected_rate?.service,
        status: 'purchased',
        label_url: labelData.postage_label?.label_url,
        weight: parseFloat(labelData.parcel?.weight) || 0,
        // Add user_id if you have RLS policies that require it
        user_id: user.user.id
      };

      const { data, error } = await supabase
        .from('shipments')
        .upsert(shipmentData, {
          onConflict: 'easypost_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error("Error saving shipment to Supabase:", error);
      } else {
        console.log("Shipment saved to Supabase:", data);
      }
    } catch (err) {
      console.error("Error in saveShipmentToSupabase:", err);
    }
  };

  return {
    shipments,
    loading
  };
};

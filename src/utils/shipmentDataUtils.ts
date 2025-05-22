
import { Shipment } from "@/components/shipment/ShipmentsTable";
import { OrderData, ShipmentInfo } from "@/types/orderTypes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Merge shipments from different sources, removing duplicates
 */
export const mergeShipments = (dbShipments: Shipment[], otherShipments: Shipment[]): Shipment[] => {
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

/**
 * Convert orders with shipment info to shipment records
 */
export const extractShipmentsFromOrders = (orders: OrderData[]): Shipment[] => {
  return orders
    .filter(order => order.shipment)
    .map(order => convertOrderToShipment(order));
};

/**
 * Convert a single order with shipment info to a shipment record
 */
export const convertOrderToShipment = (order: OrderData): Shipment => {
  return {
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
  };
};

/**
 * Save shipment data to local storage
 */
export const saveShipmentsToLocalStorage = (shipments: Shipment[]): void => {
  try {
    localStorage.setItem('shipments', JSON.stringify(shipments));
    console.log("Saved shipments to localStorage:", shipments.length);
  } catch (err) {
    console.error("Error saving shipments to localStorage:", err);
  }
};

/**
 * Load shipment data from local storage
 */
export const loadShipmentsFromLocalStorage = (): Shipment[] => {
  try {
    const storedShipments = localStorage.getItem('shipments');
    if (storedShipments) {
      const shipments = JSON.parse(storedShipments);
      console.log("Found shipments in local storage:", shipments.length);
      return shipments;
    }
  } catch (err) {
    console.error("Error parsing local storage shipments:", err);
  }
  return [];
};

/**
 * Save shipment to Supabase
 */
export const saveShipmentToSupabase = async (labelData: any): Promise<void> => {
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

/**
 * Create a shipment object from label data
 */
export const createShipmentFromLabel = (labelData: any): Shipment => {
  return {
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
};

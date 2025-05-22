
import { useState, useEffect } from 'react';
import { Shipment } from "@/components/shipment/ShipmentsTable";
import { toast } from "sonner";
import { createShipmentFromLabel, saveShipmentToSupabase } from "@/utils/shipmentDataUtils";

/**
 * Custom hook to handle newly purchased shipping labels
 */
export const usePurchasedLabelHandler = (
  shipments: Shipment[], 
  setShipments: React.Dispatch<React.SetStateAction<Shipment[]>>
) => {
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
          const newShipment = createShipmentFromLabel(labelData);
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
  }, [shipments, setShipments]);
};

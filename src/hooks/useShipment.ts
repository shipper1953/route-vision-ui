
import { useState } from 'react';
import { toast } from 'sonner';
import { ShipmentResponse, SmartRate, Rate } from '@/services/easypost';
import { supabase } from '@/integrations/supabase/client';

export const useShipment = (orderId?: string | null) => {
  const [shipmentResponse, setShipmentResponse] = useState<ShipmentResponse | null>(null);
  const [selectedRate, setSelectedRate] = useState<SmartRate | Rate | null>(null);
  const [recommendedRate, setRecommendedRate] = useState<SmartRate | Rate | null>(null);

  const handleShipmentCreated = (response: ShipmentResponse) => {
    console.log("Shipment created:", response);
    setShipmentResponse(response);
    
    // Set recommended rate if smartrates are available
    if (response.smartrates && response.smartrates.length > 0) {
      const recommended = response.smartrates[0];
      setRecommendedRate(recommended);
      setSelectedRate(recommended);
    } else if (response.rates && response.rates.length > 0) {
      // Fall back to regular rates
      const cheapest = response.rates.reduce((prev, current) => 
        parseFloat(current.rate) < parseFloat(prev.rate) ? current : prev
      );
      setRecommendedRate(cheapest);
      setSelectedRate(cheapest);
    }
  };

  const resetShipment = () => {
    setShipmentResponse(null);
    setSelectedRate(null);
    setRecommendedRate(null);
  };

  const purchaseLabel = async (shipmentId: string, rateId: string): Promise<any> => {
    try {
      console.log(`Purchasing label for shipment ${shipmentId} with rate ${rateId}`, orderId ? `for order ${orderId}` : '');
      
      // Use Supabase Edge Function and pass orderId for linking
      const { data, error } = await supabase.functions.invoke('purchase-label', {
        body: { 
          shipmentId, 
          rateId,
          orderId: orderId // Pass orderId to edge function
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(error.message || 'Failed to purchase label');
      }

      if (!data) {
        throw new Error('No data returned from purchase-label function');
      }

      console.log('Label purchased successfully:', data);
      
      // Store in session storage for the shipments page
      sessionStorage.setItem('lastPurchasedLabel', JSON.stringify(data));
      
      // Show success message
      if (orderId) {
        toast.success(`Label purchased and linked to order ${orderId}`);
      } else {
        toast.success('Label purchased successfully');
      }
      
      return data;
    } catch (error) {
      console.error('Error purchasing label:', error);
      toast.error('Failed to purchase shipping label');
      throw error;
    }
  };

  return {
    shipmentResponse,
    selectedRate,
    recommendedRate,
    setSelectedRate,
    handleShipmentCreated,
    resetShipment,
    purchaseLabel,
  };
};

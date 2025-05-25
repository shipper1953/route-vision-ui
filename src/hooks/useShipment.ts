import { useState } from 'react';
import { toast } from 'sonner';
import { ShipmentResponse, SmartRate, Rate } from '@/services/easypost';
import { linkShipmentToOrder } from '@/services/orderService';

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
      const response = await fetch('/api/purchase-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shipmentId,
          rateId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to purchase label');
      }

      const result = await response.json();
      
      // Store in session storage for the shipments page
      sessionStorage.setItem('lastPurchasedLabel', JSON.stringify(result));
      
      // Link shipment to order if orderId is provided
      if (orderId && result.id) {
        try {
          await linkShipmentToOrder(orderId, {
            id: result.id,
            carrier: result.selected_rate?.carrier || 'Unknown',
            service: result.selected_rate?.service || 'Standard',
            trackingNumber: result.tracking_code || 'Pending',
            trackingUrl: result.tracker?.public_url || '#',
            labelUrl: result.postage_label?.label_url
          });
          
          console.log(`Successfully linked shipment ${result.id} to order ${orderId}`);
        } catch (linkError) {
          console.error('Error linking shipment to order:', linkError);
          // Don't fail the entire operation if linking fails
        }
      }
      
      return result;
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

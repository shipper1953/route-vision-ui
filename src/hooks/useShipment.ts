
import { useState } from 'react';
import { toast } from 'sonner';
import { EasyPostService } from '@/services/easypost';
import { LabelService } from '@/services/easypost/labelService';
import { linkShipmentToOrder } from '@/services/orderShipmentLinking';

export const useShipment = (initialOrderId?: string | null) => {
  const [shipmentResponse, setShipmentResponse] = useState<any>(null);
  const [selectedRate, setSelectedRate] = useState<any>(null);
  const [recommendedRate, setRecommendedRate] = useState<any>(null);

  const handleShipmentCreated = (response: any) => {
    console.log('Shipment created:', response);
    setShipmentResponse(response);
    
    // Find and set recommended rate
    if (response.rates?.length > 0) {
      const cheapestRate = response.rates.reduce((prev: any, current: any) => 
        (parseFloat(prev.rate) < parseFloat(current.rate)) ? prev : current
      );
      setRecommendedRate(cheapestRate);
      setSelectedRate(cheapestRate);
    }
  };

  const resetShipment = () => {
    setShipmentResponse(null);
    setSelectedRate(null);
    setRecommendedRate(null);
  };

  const purchaseLabel = async (shipmentId: string, rateId: string) => {
    try {
      console.log('Purchasing label with orderId:', initialOrderId);
      const labelService = new LabelService('');
      
      // Call the edge function with orderId if available
      const result = await labelService.purchaseLabel(shipmentId, rateId, initialOrderId);
      
      console.log('Label purchase result:', result);
      
      // If we have an orderId and the edge function didn't handle linking, try client-side linking
      if (initialOrderId && result) {
        try {
          console.log('Attempting client-side order linking for order:', initialOrderId);
          await linkShipmentToOrder(initialOrderId, {
            id: result.id,
            carrier: result.selected_rate?.carrier || 'Unknown',
            service: result.selected_rate?.service || 'Unknown',
            trackingNumber: result.tracking_code || '',
            trackingUrl: result.tracker?.public_url || '',
            cost: parseFloat(result.selected_rate?.rate || '0'),
            labelUrl: result.postage_label?.label_url
          });
          console.log('Client-side order linking successful');
        } catch (linkError) {
          console.error('Client-side order linking failed:', linkError);
          // Don't fail the whole operation for linking issues
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error purchasing label:', error);
      toast.error('Failed to purchase label');
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
    purchaseLabel
  };
};

import { useState } from 'react';
import { toast } from 'sonner';
import { LabelService } from '@/services/easypost/labelService';
import { linkShipmentToOrder } from '@/services/orderShipmentLinking';
import { CombinedRateResponse } from '@/services/rateShoppingService';
import { logEvent } from '@/services/shipping/analytics';
export const useShipment = (initialOrderId?: string | null) => {
  const [shipmentResponse, setShipmentResponse] = useState<CombinedRateResponse | null>(null);
  const [selectedRate, setSelectedRate] = useState<any>(null);
  const [recommendedRate, setRecommendedRate] = useState<any>(null);

  const handleShipmentCreated = (response: CombinedRateResponse) => {
    console.log('Combined shipment created:', response);
    setShipmentResponse(response);
    
    // Find and set recommended rate from combined rates
    if (response.rates?.length > 0) {
      const cheapestRate = response.rates.reduce((prev: any, current: any) => 
        (parseFloat(prev.rate) < parseFloat(current.rate)) ? prev : current
      );
      setRecommendedRate(cheapestRate);
      setSelectedRate(cheapestRate);
      
      console.log('Cheapest rate found:', cheapestRate);
      console.log('Provider:', cheapestRate.provider);
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
      console.log('Selected rate:', selectedRate);
      
      // Determine which shipment ID to use based on the selected rate's provider
      let actualShipmentId = shipmentId;
      
      if (selectedRate?.provider === 'easypost' && shipmentResponse?.easypost_shipment?.id) {
        actualShipmentId = shipmentResponse.easypost_shipment.id;
        console.log('Using EasyPost shipment ID:', actualShipmentId);
      } else if (selectedRate?.provider === 'shippo' && shipmentResponse?.shippo_shipment?.object_id) {
        actualShipmentId = shipmentResponse.shippo_shipment.object_id;
        console.log('Using Shippo shipment ID:', actualShipmentId);
      }
      
      const labelService = new LabelService('');
      
      // Call the edge function with orderId and provider if available
      const result = await labelService.purchaseLabel(actualShipmentId, rateId, initialOrderId, selectedRate?.provider);
      
      console.log('Label purchase result:', result);
      await logEvent('label_purchased', {
        orderId: initialOrderId || null,
        provider: selectedRate?.provider || null,
        carrier: selectedRate?.carrier || null,
        service: selectedRate?.service || null,
        rateId,
        shipmentId: actualShipmentId,
      });
      
      // The edge function now handles all linking internally, so no need for client-side linking
      toast.success('Shipping label purchased successfully!');
      
      return result;
    } catch (error: any) {
      console.error('Error purchasing label:', error);
      await logEvent('label_failed', {
        orderId: initialOrderId || null,
        provider: selectedRate?.provider || null,
        carrier: selectedRate?.carrier || null,
        service: selectedRate?.service || null,
        rateId,
        shipmentId,
        error: error?.message || String(error),
      });
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

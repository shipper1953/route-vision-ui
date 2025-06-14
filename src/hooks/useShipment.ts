
import { useState } from 'react';
import { toast } from 'sonner';
import { ShipmentResponse, SmartRate, Rate } from '@/services/easypost';
import { supabase } from '@/integrations/supabase/client';
import { linkShipmentToOrder } from '@/services/orderShipmentService';

export const useShipment = (orderId?: string | null) => {
  const [shipmentResponse, setShipmentResponse] = useState<ShipmentResponse | null>(null);
  const [selectedRate, setSelectedRate] = useState<SmartRate | Rate | null>(null);
  const [recommendedRate, setRecommendedRate] = useState<SmartRate | Rate | null>(null);

  const handleShipmentCreated = (response: ShipmentResponse) => {
    console.log("Shipment created:", response);
    setShipmentResponse(response);
    
    // Set recommended rate if smartRates are available
    if (response.smartRates && response.smartRates.length > 0) {
      const recommended = response.smartRates[0];
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
      
      // Get the current session and validate it thoroughly
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('Session check:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasAccessToken: !!session?.access_token,
        userEmail: session?.user?.email,
        sessionError: sessionError
      });
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!session) {
        console.error('No session found');
        throw new Error('No active session found. Please log in again.');
      }
      
      if (!session.access_token) {
        console.error('No access token in session');
        throw new Error('No valid authentication token. Please log out and log back in.');
      }
      
      if (!session.user) {
        console.error('No user in session');
        throw new Error('No user found in session. Please log in again.');
      }
      
      console.log('Session validation passed for user:', session.user.email);
      
      // Call the Edge Function with explicit authorization
      console.log('Calling purchase-label Edge Function...');
      const { data, error } = await supabase.functions.invoke('purchase-label', {
        body: { 
          shipmentId, 
          rateId,
          orderId: orderId ? String(orderId) : null
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        
        // Check for specific error types
        if (error.message.includes('Auth session missing') || error.message.includes('Unauthorized')) {
          throw new Error('Authentication failed. Please log out and log back in.');
        }
        
        throw new Error(error.message || 'Failed to purchase label');
      }

      if (!data) {
        throw new Error('No data returned from purchase-label function');
      }

      console.log('Label purchased successfully:', data);
      
      // If we have an orderId, also try to link it to the order directly
      if (orderId) {
        try {
          await linkShipmentToOrder(String(orderId), {
            id: data.id,
            carrier: data.selected_rate?.carrier || 'Unknown',
            service: data.selected_rate?.service || 'Standard',
            trackingNumber: data.tracking_code || 'Pending',
            trackingUrl: data.tracker?.public_url || '#',
            cost: parseFloat(data.selected_rate?.rate) || 0
          });
          console.log(`Successfully linked shipment to order ${orderId}`);
        } catch (linkError) {
          console.error('Error linking shipment to order:', linkError);
          // Don't fail the whole operation if linking fails
        }
      }
      
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

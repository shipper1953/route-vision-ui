import { supabase } from "@/integrations/supabase/client";
import { getOriginalRateAmount } from "@/utils/rateMarkupUtils";

export class LabelService {
  private apiKey: string;
  private baseUrl = "https://api.easypost.com/v2";
  private useEdgeFunctions: boolean;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.useEdgeFunctions = !apiKey;
  }

  async purchaseLabel(shipmentId: string, rateId: string, orderId?: string | null, provider?: string): Promise<any> {
    try {
      console.log(`Purchasing label for shipment ${shipmentId} with rate ${rateId}${orderId ? ` for order ${orderId}` : ''} using ${provider || 'easypost'}`);
      
      if (this.useEdgeFunctions) {
        return this.purchaseLabelViaEdgeFunction(shipmentId, rateId, orderId, provider);
      }
      
      return this.purchaseLabelDirectly(shipmentId, rateId);
    } catch (error) {
      console.error('Error purchasing label:', error);
      throw error;
    }
  }

  private async purchaseLabelViaEdgeFunction(shipmentId: string, rateId: string, orderId?: string | null, provider?: string): Promise<any> {
    const requestBody: any = { shipmentId, rateId };
    
    // Include orderId if provided
    if (orderId) {
      requestBody.orderId = orderId;
      console.log('Including orderId in edge function request:', orderId);
    }

    // Include provider if provided
    if (provider) {
      requestBody.provider = provider;
      console.log('Including provider in edge function request:', provider);
    }

    console.log('Calling purchase-label edge function with:', requestBody);

    try {
      const response = await fetch(`${window.location.origin.replace('https://f60d16ad-630c-47ed-bfa7-82586b1ceebb.lovableproject.com', 'https://gidrlosmhpvdcogrkidj.supabase.co')}/functions/v1/purchase-label`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZHJsb3NtaHB2ZGNvZ3JraWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyOTMzMzIsImV4cCI6MjA2Mjg2OTMzMn0.DJ5r3pTVbJ80xR_kBNsc_5B_wXpIc8At646Ts-ls35Q'
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();
      console.log('Raw edge function response:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        responseData = { raw_response: responseText };
      }

      if (!response.ok) {
        console.error('Edge function returned error status:', response.status);
        console.error('Error response data:', responseData);
        
        // Extract the actual error message from the edge function response
        const errorMessage = responseData?.error || responseData?.details || `Edge function error (${response.status})`;
        throw new Error(errorMessage);
      }

      console.log('Edge function success response:', responseData);
      this.storeLabelData(responseData);
      return responseData;

    } catch (fetchError) {
      console.error('Edge function fetch error:', fetchError);
      
      // If it's our custom error, re-throw it
      if (fetchError.message && !fetchError.message.includes('fetch')) {
        throw fetchError;
      }
      
      // Fallback to supabase client for network issues
      console.log('Falling back to supabase client...');
      const { data, error } = await supabase.functions.invoke('purchase-label', {
        body: requestBody
      });
      
      if (error) {
        console.error('Supabase client also failed:', error);
        throw new Error(error.message || 'Failed to purchase label via edge function');
      }
      
      this.storeLabelData(data);
      return data;
    }
  }

  private async purchaseLabelDirectly(shipmentId: string, rateId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/shipments/${shipmentId}/buy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        rate: { id: rateId }
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error purchasing label:', errorData);
      throw new Error(errorData.error?.message || 'Failed to purchase label');
    }
    
    const labelData = await response.json();
    console.log('Label purchased successfully:', labelData);
    
    this.storeLabelData(labelData);
    return labelData;
  }

  private storeLabelData(labelData: any): void {
    if (labelData) {
      sessionStorage.setItem('lastPurchasedLabel', JSON.stringify(labelData));
      
      try {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        const updatedOrders = orders.map((order: any) => {
          if (order.status === 'ready_to_ship') {
            return {...order, status: 'shipped'};
          }
          return order;
        });
        localStorage.setItem('orders', JSON.stringify(updatedOrders));
      } catch (e) {
        console.log('Could not update orders in localStorage:', e);
      }
    }
  }
}

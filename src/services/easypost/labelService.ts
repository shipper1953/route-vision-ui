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

    const { data, error } = await supabase.functions.invoke('purchase-label', {
      body: requestBody
    });
    
    console.log('Edge function response:', { data, error });
    
    
    if (error) {
      console.error('Edge Function error details:', error);
      console.error('Error message:', error.message);
      console.error('Error context:', error.context);
      
      // Try to get more detailed error info
      if (error.message.includes('non-2xx status code')) {
        // Let's try calling the test function to see if the deployment system is working
        console.log('Testing if edge functions are working...');
        try {
          const { data: testData, error: testError } = await supabase.functions.invoke('test-function', {
            body: { test: true }
          });
          console.log('Test function result:', { testData, testError });
        } catch (testErr) {
          console.error('Test function also failed:', testErr);
        }
      }
      
      // Check if it's a 422 error with detailed response
      if (error.message.includes('422')) {
        try {
          const errorDetails = JSON.parse(error.message.split('422 ')[1]);
          if (errorDetails.error === 'EasyPost API error' && errorDetails.details?.error?.message) {
            throw new Error(`EasyPost validation failed: ${errorDetails.details.error.message}`);
          }
        } catch (parseError) {
          // If parsing fails, just throw the original error
        }
      }
      
      // Provide a more specific error message
      let errorMessage = error.message;
      if (error.message.includes('non-2xx status code')) {
        errorMessage = 'Edge function deployment error. The purchase-label function may not be properly deployed.';
      }
      
      throw new Error(errorMessage);
    }
    
    this.storeLabelData(data);
    return data;
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

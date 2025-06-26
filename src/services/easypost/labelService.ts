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

  async purchaseLabel(shipmentId: string, rateId: string, orderId?: string | null): Promise<any> {
    try {
      console.log(`Purchasing label for shipment ${shipmentId} with rate ${rateId}${orderId ? ` for order ${orderId}` : ''}`);
      
      if (this.useEdgeFunctions) {
        return this.purchaseLabelViaEdgeFunction(shipmentId, rateId, orderId);
      }
      
      return this.purchaseLabelDirectly(shipmentId, rateId);
    } catch (error) {
      console.error('Error purchasing label:', error);
      throw error;
    }
  }

  private async purchaseLabelViaEdgeFunction(shipmentId: string, rateId: string, orderId?: string | null): Promise<any> {
    const requestBody: any = { shipmentId, rateId };
    
    // Include orderId if provided
    if (orderId) {
      requestBody.orderId = orderId;
      console.log('Including orderId in edge function request:', orderId);
    }

    const { data, error } = await supabase.functions.invoke('purchase-label', {
      body: requestBody
    });
    
    if (error) {
      console.error('Edge Function error:', error);
      
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
      
      throw new Error(error.message);
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

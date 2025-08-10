import { supabase } from "@/integrations/supabase/client";
import { getOriginalRateAmount } from "@/utils/rateMarkupUtils";
import { RateShoppingService } from "@/services/rateShoppingService";
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

  async purchaseMultipleLabels(params: {
    packages: Array<{ length: number; width: number; height: number; weight: number }>;
    orderId?: string | null;
    provider?: string;
    carrier?: string;
    service?: string;
    to: any;
    from: any;
  }): Promise<any> {
    try {
      if (!this.useEdgeFunctions) {
        throw new Error('Bulk purchasing is only supported via edge functions');
      }
       return this.purchaseMultipleLabelsViaEdgeFunction(params);
     } catch (error) {
       console.error('Error purchasing multiple labels:', error);
       throw error;
     }
   }
 
   // Estimate total cost for purchasing multiple labels (no purchase is made)
   async estimateMultipleLabelsCost(params: {
     packages: Array<{ length: number; width: number; height: number; weight: number }>;
     provider?: string;
     carrier?: string;
     service?: string;
     to: any;
     from: any;
   }): Promise<{ total: number; perParcel: Array<{ index: number; rate: string; provider: string; carrier: string; service: string }> }> {
     const { packages, provider, carrier, service, to, from } = params;
     const rateService = new RateShoppingService();
     const perParcel: Array<{ index: number; rate: string; provider: string; carrier: string; service: string }> = [];
     let total = 0;
 
     for (let i = 0; i < packages.length; i++) {
       const parcel = packages[i];
       const shipmentData: any = {
         to_address: {
           name: to?.name || to?.company || '',
           company: to?.company || undefined,
           street1: to?.street1 || '',
           street2: to?.street2 || undefined,
           city: to?.city || '',
           state: to?.state || '',
           zip: to?.zip || '',
           country: to?.country || 'US',
           phone: to?.phone || '5555555555',
           email: to?.email || undefined,
         },
         from_address: {
           name: from?.name || from?.company || '',
           company: from?.company || undefined,
           street1: from?.street1 || '',
           street2: from?.street2 || undefined,
           city: from?.city || '',
           state: from?.state || '',
           zip: from?.zip || '',
           country: from?.country || 'US',
           phone: from?.phone || '5555550123',
           email: from?.email || undefined,
         },
         parcel: {
           length: parcel.length,
           width: parcel.width,
           height: parcel.height,
           weight: parcel.weight,
         },
       };
 
       const combined = await rateService.getRatesFromAllProviders(shipmentData);
       const desiredProvider = (provider || 'easypost') as 'easypost' | 'shippo';
       let selectedRate = combined.rates.find(
         (r) => r.provider === desiredProvider && r.carrier === carrier && r.service === service
       );
       if (!selectedRate) {
         const candidates = combined.rates.filter((r) => r.provider === desiredProvider);
         selectedRate = candidates.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0] || combined.rates[0];
       }
 
       if (!selectedRate) {
         throw new Error('No rate found during cost estimation');
       }
 
       const amt = parseFloat(selectedRate.rate);
       total += isNaN(amt) ? 0 : amt;
       perParcel.push({ index: i, rate: selectedRate.rate, provider: selectedRate.provider, carrier: selectedRate.carrier, service: selectedRate.service });
     }
 
     return { total, perParcel };
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
        
        // Extract the most specific error message available
        const errorMessage = responseData?.details || responseData?.error || `Edge function error (${response.status})`;
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

  private async purchaseMultipleLabelsViaEdgeFunction(params: {
    packages: Array<{ length: number; width: number; height: number; weight: number }>;
    orderId?: string | null;
    provider?: string;
    carrier?: string;
    service?: string;
    to: any;
    from: any;
  }): Promise<{ results: any[]; errors: any[] }> {
    const { packages, orderId, provider, carrier, service, to, from } = params;
    const results: any[] = [];
    const errors: any[] = [];
    const rateService = new RateShoppingService();

    for (let i = 0; i < packages.length; i++) {
      const parcel = packages[i];

      // Build shipment data for this parcel
      const shipmentData: any = {
        to_address: {
          name: to?.name || to?.company || '',
          company: to?.company || undefined,
          street1: to?.street1 || '',
          street2: to?.street2 || undefined,
          city: to?.city || '',
          state: to?.state || '',
          zip: to?.zip || '',
          country: to?.country || 'US',
          phone: to?.phone || '5555555555',
          email: to?.email || undefined,
        },
        from_address: {
          name: from?.name || from?.company || '',
          company: from?.company || undefined,
          street1: from?.street1 || '',
          street2: from?.street2 || undefined,
          city: from?.city || '',
          state: from?.state || '',
          zip: from?.zip || '',
          country: from?.country || 'US',
          phone: from?.phone || '5555550123',
          email: from?.email || undefined,
        },
        parcel: {
          length: parcel.length,
          width: parcel.width,
          height: parcel.height,
          weight: parcel.weight,
        },
        options: { label_format: 'PDF' },
      };

      try {
        // Get rates from both providers for this parcel
        const combined = await rateService.getRatesFromAllProviders(shipmentData);

        // Pick a rate matching selected provider/carrier/service when possible
        const desiredProvider = (provider || 'easypost') as 'easypost' | 'shippo';
        let selectedRate = combined.rates.find(
          (r) => r.provider === desiredProvider && r.carrier === carrier && r.service === service
        );
        if (!selectedRate) {
          const candidates = combined.rates.filter((r) => r.provider === desiredProvider);
          selectedRate = candidates.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0] || combined.rates[0];
        }

        // Determine shipment id per provider
        let actualShipmentId: string | undefined;
        if (desiredProvider === 'shippo') {
          actualShipmentId = combined.shippo_shipment?.object_id;
        } else {
          actualShipmentId = combined.easypost_shipment?.id;
        }

        if (!selectedRate || !actualShipmentId) {
          throw new Error('No matching rate or shipment id found for parcel');
        }

        // Purchase the label using the existing edge function
        const purchase = await this.purchaseLabelViaEdgeFunction(
          actualShipmentId,
          selectedRate.id,
          orderId,
          desiredProvider
        );

        results.push({ index: i, purchase });
      } catch (err: any) {
        console.error('Failed to purchase label for parcel', i, err);
        errors.push({ index: i, error: err?.message || String(err) });
      }

      // Small delay to avoid provider rate limits
      await new Promise((res) => setTimeout(res, 250));
    }

    return { results, errors };
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

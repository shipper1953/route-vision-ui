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

  async purchaseLabel(
    shipmentId: string,
    rateId: string,
    orderId?: string | null,
    provider?: string,
    selectedBoxData?: any,
    originalCost?: number | null,
    markedUpCost?: number | null
  ): Promise<any> {
    try {
      console.log(`Purchasing label for shipment ${shipmentId} with rate ${rateId}${orderId ? ` for order ${orderId}` : ''} using ${provider || 'easypost'}`);
      
      if (this.useEdgeFunctions) {
        return this.purchaseLabelViaEdgeFunction(shipmentId, rateId, orderId, provider, selectedBoxData, originalCost, markedUpCost);
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
    selectedRates?: Array<{ 
      shipmentId: string; 
      rateId: string; 
      provider: string; 
      boxId?: string | null;
      boxData?: { name: string; length: number; width: number; height: number };
      items?: Array<any>;
      packageIndex?: number;
    }>;
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

      // Choose best available rate with graceful fallback
      let selectedRate = combined.rates.find(
        (r) => r.provider === desiredProvider && r.carrier === carrier && r.service === service
      );
      if (!selectedRate) {
        const candidates = combined.rates.filter((r) => r.provider === desiredProvider);
        if (candidates.length > 0) {
          selectedRate = candidates.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0];
        }
      }
      if (!selectedRate && combined.rates.length > 0) {
        // Fallback to absolute cheapest across all providers
        selectedRate = combined.rates.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0];
      }

      if (!selectedRate) {
        console.warn('No rates returned during cost estimation for parcel index', i);
        // Skip this parcel in estimation rather than throwing
        continue;
      }

      const amt = parseFloat(selectedRate.rate);
      total += isNaN(amt) ? 0 : amt;
      perParcel.push({ index: i, rate: selectedRate.rate, provider: selectedRate.provider, carrier: selectedRate.carrier, service: selectedRate.service });
     }
 
     return { total, perParcel };
   }
 
  private async purchaseLabelViaEdgeFunction(
    shipmentId: string,
    rateId: string,
    orderId?: string | null,
    provider?: string,
    selectedBoxData?: any,
    originalCost?: number | null,
    markedUpCost?: number | null,
    packageMetadata?: {
      packageIndex: number;
      items: Array<any>;
      boxData: { name: string; length: number; width: number; height: number };
      weight: number;
    }
  ): Promise<any> {
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

    // Include selected box data if provided
    if (selectedBoxData) {
      requestBody.selectedBox = selectedBoxData;
      console.log('Including selected box data in edge function request:', selectedBoxData);
    }

    // Include cost data if provided
    if (originalCost !== null && originalCost !== undefined) {
      requestBody.originalCost = originalCost;
      console.log('Including original cost in edge function request:', originalCost);
    }
    if (markedUpCost !== null && markedUpCost !== undefined) {
      requestBody.markedUpCost = markedUpCost;
      console.log('Including marked-up cost in edge function request:', markedUpCost);
    }

    // Include package metadata if provided
    if (packageMetadata) {
      requestBody.packageMetadata = packageMetadata;
      console.log('Including package metadata in edge function request:', packageMetadata);
    }

    console.log('Calling purchase-label edge function with:', requestBody);

    // Always use Supabase functions client to avoid URL/env issues
    const { data, error } = await supabase.functions.invoke('purchase-label', {
      body: requestBody,
    });

    if (error) {
      console.error('Supabase purchase-label error:', error);
      throw new Error(error.message || 'Failed to purchase label via edge function');
    }

    this.storeLabelData(data as any);
    return data;
  }

  private async purchaseMultipleLabelsViaEdgeFunction(params: {
    packages: Array<{ length: number; width: number; height: number; weight: number }>;
    orderId?: string | null;
    provider?: string;
    carrier?: string;
    service?: string;
    to: any;
    from: any;
    selectedRates?: Array<{ 
      shipmentId: string; 
      rateId: string; 
      provider: string; 
      boxId?: string | null;
      boxData?: { name: string; length: number; width: number; height: number };
      items?: Array<any>;
      packageIndex?: number;
    }>;
  }): Promise<{ results: any[]; errors: any[] }> {
    const { packages, orderId, selectedRates } = params;
    const results: any[] = [];
    const errors: any[] = [];

    // If we have pre-selected rates with shipment and rate IDs, use them directly
    if (selectedRates && selectedRates.length === packages.length) {
      console.log('Using pre-selected rates for multi-package purchase:', selectedRates);
      
      for (let i = 0; i < selectedRates.length; i++) {
        const { shipmentId, rateId, provider, boxId, boxData, items, packageIndex } = selectedRates[i];
        
        try {
          console.log(`Purchasing label ${i + 1}/${selectedRates.length}:`, { shipmentId, rateId, provider, boxId, packageIndex });
          
          // Build selected box data if we have a box ID
          const selectedBoxData = boxId ? { boxId } : undefined;
          
          // Build package metadata if we have items and box data
          const packageMetadata = items && boxData ? {
            packageIndex: packageIndex !== undefined ? packageIndex : i,
            items,
            boxData,
            weight: packages[i].weight
          } : undefined;
          
          const result = await this.purchaseLabelViaEdgeFunction(
            shipmentId,
            rateId,
            orderId,
            provider,
            selectedBoxData,
            undefined, // originalCost
            undefined, // markedUpCost
            packageMetadata
          );
          
          results.push({ purchase: result, index: i });
        } catch (error) {
          console.error(`Failed to purchase label for package ${i + 1}:`, error);
          errors.push({ error: error instanceof Error ? error.message : 'Unknown error', index: i });
        }
      }
      
      return { results, errors };
    }

    // Fallback to original logic if no pre-selected rates
    console.log('No pre-selected rates provided, fetching rates for each package...');
    const { provider, carrier, service, to, from } = params;
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
          const desiredProvider = (provider || undefined) as 'easypost' | 'shippo' | undefined;
          let selectedRate = desiredProvider
            ? combined.rates.find((r) => r.provider === desiredProvider && r.carrier === carrier && r.service === service)
            : undefined;

          if (!selectedRate && desiredProvider) {
            const candidates = combined.rates.filter((r) => r.provider === desiredProvider);
            if (candidates.length > 0) {
              selectedRate = candidates.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0];
            }
          }

          if (!selectedRate && combined.rates.length > 0) {
            // Fallback to absolute cheapest across all providers
            selectedRate = combined.rates.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0];
          }

          // Last-chance retry with slightly adjusted dimensions if still no rates
          if (!selectedRate && (!combined.rates || combined.rates.length === 0)) {
            const adjusted = {
              ...shipmentData,
              parcel: {
                length: Math.max(1, Math.floor((shipmentData.parcel.length || 1) - 0.1)),
                width: Math.max(1, Math.floor((shipmentData.parcel.width || 1) - 0.1)),
                height: Math.max(1, Math.floor((shipmentData.parcel.height || 1) - 0.1)),
                weight: Math.max(1, Math.ceil(shipmentData.parcel.weight || 1)),
              }
            };
            console.warn('No rates found, retrying with adjusted parcel:', adjusted.parcel);
            const retryCombined = await rateService.getRatesFromAllProviders(adjusted as any);
            if (retryCombined.rates?.length) {
              const desiredRetry = desiredProvider
                ? retryCombined.rates.find((r) => r.provider === desiredProvider && r.carrier === carrier && r.service === service)
                : undefined;
              selectedRate = desiredRetry || retryCombined.rates.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0];
              // Replace vars to continue flow
              (shipmentData as any) = adjusted;
              (combined as any) = retryCombined;
            }
          }

          if (!selectedRate) {
            console.error('No rates for parcel with data:', { parcel: shipmentData.parcel, to, from });
            throw new Error('No rates available for this parcel');
          }


        // Determine shipment id based on selected rate's provider
        let actualShipmentId: string | undefined;
        if (selectedRate.provider === 'shippo') {
          actualShipmentId = combined.shippo_shipment?.object_id;
        } else {
          actualShipmentId = combined.easypost_shipment?.id;
        }

        // If shipment id missing for chosen provider, try switching to the other provider
        if (!actualShipmentId) {
          if (selectedRate.provider === 'shippo' && combined.easypost_shipment?.id) {
            const epCandidates = combined.rates.filter((r) => r.provider === 'easypost');
            if (epCandidates.length > 0) {
              selectedRate = epCandidates.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0];
              actualShipmentId = combined.easypost_shipment.id;
            }
          } else if (selectedRate.provider === 'easypost' && combined.shippo_shipment?.object_id) {
            const shCandidates = combined.rates.filter((r) => r.provider === 'shippo');
            if (shCandidates.length > 0) {
              selectedRate = shCandidates.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0];
              actualShipmentId = combined.shippo_shipment.object_id;
            }
          }
        }

        if (!actualShipmentId) {
          throw new Error('No shipment id available for selected provider');
        }

        // Attempt purchase, with provider fallback if it fails
        let purchase: any | null = null;
        try {
          console.log(`Attempting purchase for parcel ${i}: provider=${selectedRate.provider}, rateId=${selectedRate.id}, shipmentId=${actualShipmentId}`);
          purchase = await this.purchaseLabelViaEdgeFunction(
            actualShipmentId,
            selectedRate.id,
            orderId,
            selectedRate.provider
          );
        } catch (primaryErr: any) {
          console.warn(`Primary purchase failed for parcel ${i}:`, primaryErr?.message || primaryErr);
          // Try alternate provider if available
          if (selectedRate.provider === 'shippo' && combined.easypost_shipment?.id) {
            const epCandidates = combined.rates.filter((r) => r.provider === 'easypost');
            const epRate = epCandidates.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0];
            if (epRate) {
              console.log(`Falling back to EasyPost for parcel ${i}: rateId=${epRate.id}`);
              purchase = await this.purchaseLabelViaEdgeFunction(
                combined.easypost_shipment.id,
                epRate.id,
                orderId,
                'easypost'
              );
            }
          } else if (selectedRate.provider === 'easypost' && combined.shippo_shipment?.object_id) {
            const shCandidates = combined.rates.filter((r) => r.provider === 'shippo');
            const shRate = shCandidates.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0];
            if (shRate) {
              console.log(`Falling back to Shippo for parcel ${i}: rateId=${shRate.id}`);
              purchase = await this.purchaseLabelViaEdgeFunction(
                combined.shippo_shipment.object_id,
                shRate.id,
                orderId,
                'shippo'
              );
            }
          }

          if (!purchase) {
            throw primaryErr;
          }
        }

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

import { ShipmentService } from "./easypost/shipmentService";
import { ShippoService, ShippoRate } from "./shippo/shippoService";
import { ShipmentRequest, Rate, SmartRate } from "@/types/easypost";

export interface CombinedRate extends Rate {
  provider: 'easypost' | 'shippo';
  original_rate?: any;
}

export interface CombinedSmartRate extends SmartRate {
  provider: 'easypost' | 'shippo';
  original_rate?: any;
}

export interface CombinedRateResponse {
  id: string;
  rates: CombinedRate[];
  smartRates?: CombinedSmartRate[];
  easypost_shipment?: any;
  shippo_shipment?: any;
}

export class RateShoppingService {
  private easyPostService: ShipmentService;
  private shippoService: ShippoService;

  constructor() {
    this.easyPostService = new ShipmentService(''); // Will use edge functions
    this.shippoService = new ShippoService(''); // Will use edge functions
  }

  async getRatesFromAllProviders(shipmentData: ShipmentRequest): Promise<CombinedRateResponse> {
    console.log('🛒 Starting rate shopping from multiple providers...');
    
    const results = await Promise.allSettled([
      this.getEasyPostRates(shipmentData),
      this.getShippoRates(shipmentData)
    ]);

    const combinedRates: CombinedRate[] = [];
    const combinedSmartRates: CombinedSmartRate[] = [];
    let easypost_shipment = null;
    let shippo_shipment = null;

    // Process EasyPost results
    if (results[0].status === 'fulfilled') {
      const easyPostResponse = results[0].value;
      easypost_shipment = easyPostResponse;
      
      // Add regular rates
      if (easyPostResponse.rates) {
        const easyPostRates = easyPostResponse.rates.map((rate: Rate) => ({
          ...rate,
          provider: 'easypost' as const,
          original_rate: rate
        }));
        combinedRates.push(...easyPostRates);
      }

      // Add smart rates if available
      if (easyPostResponse.smartRates) {
        const easyPostSmartRates = easyPostResponse.smartRates.map((rate: SmartRate) => ({
          ...rate,
          provider: 'easypost' as const,
          original_rate: rate
        }));
        combinedSmartRates.push(...easyPostSmartRates);
      }

      console.log('✅ EasyPost rates fetched:', easyPostResponse.rates?.length || 0);
    } else {
      console.warn('⚠️ EasyPost rates failed:', results[0].reason);
    }

    // Process Shippo results
    if (results[1].status === 'fulfilled') {
      const shippoResponse = results[1].value;
      shippo_shipment = shippoResponse;
      
      if (shippoResponse.rates) {
        console.log('Shippo rates raw data:', shippoResponse.rates);
        
        const shippoRates = shippoResponse.rates.map((rate: ShippoRate) => {
          console.log('Processing Shippo rate:', {
            id: rate.object_id,
            provider: rate.provider,
            servicelevel: rate.servicelevel,
            amount: rate.amount
          });
          
          return {
            id: rate.object_id,
            carrier: rate.provider,
            service: rate.servicelevel?.name || 'Standard',
            rate: rate.amount,
            currency: rate.currency,
            delivery_days: rate.delivery_days || rate.estimated_days,
            delivery_date: null,
            delivery_date_guaranteed: false,
            est_delivery_days: rate.estimated_days,
            provider: 'shippo' as const,
            original_rate: rate
          } as CombinedRate;
        });
        
        console.log('Processed Shippo rates:', shippoRates);
        combinedRates.push(...shippoRates);
      }

      console.log('✅ Shippo rates fetched:', shippoResponse.rates?.length || 0);
    } else {
      console.warn('⚠️ Shippo rates failed:', results[1].reason);
    }

    // Sort combined rates by price (guard against invalid/empty rate values)
    const getRateValue = (rate: { rate: string }) => {
      const parsed = Number.parseFloat(rate.rate);
      return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
    };
    combinedRates.sort((a, b) => getRateValue(a) - getRateValue(b));
    combinedSmartRates.sort((a, b) => getRateValue(a) - getRateValue(b));

    console.log('🎯 Combined rate shopping complete:');
    console.log(`   - Total rates: ${combinedRates.length}`);
    console.log(`   - EasyPost rates: ${combinedRates.filter(r => r.provider === 'easypost').length}`);
    console.log(`   - Shippo rates: ${combinedRates.filter(r => r.provider === 'shippo').length}`);

    return {
      id: `combined_${Date.now()}`,
      rates: combinedRates,
      smartRates: combinedSmartRates.length > 0 ? combinedSmartRates : undefined,
      easypost_shipment,
      shippo_shipment
    };
  }

  private async getEasyPostRates(shipmentData: ShipmentRequest) {
    try {
      console.log('📦 Fetching EasyPost rates...');
      return await this.easyPostService.createShipment(shipmentData);
    } catch (error) {
      console.error('EasyPost rate fetching failed:', error);
      throw error;
    }
  }

  private async getShippoRates(shipmentData: ShipmentRequest) {
    try {
      console.log('🚢 Fetching Shippo rates...');
      return await this.shippoService.createShipment(shipmentData);
    } catch (error) {
      console.error('Shippo rate fetching failed:', error);
      throw error;
    }
  }
}

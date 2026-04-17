import { ShipmentService } from "./easypost/shipmentService";
import { ShippoService, ShippoRate } from "./shippo/shippoService";
import { EasyshipService, EasyshipRate } from "./easyship/easyshipService";
import { ShipmentRequest, Rate, SmartRate } from "@/types/easypost";
import { RankedRateRecommendations, RankedRate, ProviderStatus, RateDecisionMetadata } from "./cartonization/types";

export interface CombinedRate extends Rate {
  provider: 'easypost' | 'shippo' | 'easyship';
  original_rate?: any;
}

export interface CombinedSmartRate extends SmartRate {
  provider: 'easypost' | 'shippo' | 'easyship';
  original_rate?: any;
}

export interface CombinedRateResponse {
  id: string;
  rates: CombinedRate[];
  smartRates?: CombinedSmartRate[];
  easypost_shipment?: any;
  shippo_shipment?: any;
  easyship_shipment?: any;
  // New: decision metadata
  decisionMetadata: RateDecisionMetadata;
}

export class RateShoppingService {
  private easyPostService: ShipmentService;
  private shippoService: ShippoService;
  private easyshipService: EasyshipService;

  constructor() {
    this.easyPostService = new ShipmentService('');
    this.shippoService = new ShippoService('');
    this.easyshipService = new EasyshipService();
  }

  async getRatesFromAllProviders(shipmentData: ShipmentRequest): Promise<CombinedRateResponse> {
    const startTime = Date.now();
    console.log('🛒 Starting rate shopping from multiple providers...');
    
    const providerStatuses: ProviderStatus[] = [];
    const degradedProviders: string[] = [];

    const results = await Promise.allSettled([
      this.getEasyPostRates(shipmentData),
      this.getShippoRates(shipmentData),
      this.getEasyshipRates(shipmentData)
    ]);

    const combinedRates: CombinedRate[] = [];
    const combinedSmartRates: CombinedSmartRate[] = [];
    let easypost_shipment = null;
    let shippo_shipment = null;
    let easyship_shipment = null;

    // Process EasyPost results
    if (results[0].status === 'fulfilled') {
      const easyPostResponse = results[0].value;
      easypost_shipment = easyPostResponse;
      
      if (easyPostResponse.rates) {
        const easyPostRates = easyPostResponse.rates.map((rate: Rate) => ({
          ...rate,
          provider: 'easypost' as const,
          original_rate: rate
        }));
        combinedRates.push(...easyPostRates);
      }

      if (easyPostResponse.smartRates) {
        const easyPostSmartRates = easyPostResponse.smartRates.map((rate: SmartRate) => ({
          ...rate,
          provider: 'easypost' as const,
          original_rate: rate
        }));
        combinedSmartRates.push(...easyPostSmartRates);
      }

      providerStatuses.push({ provider: 'easypost', available: true, latencyMs: Date.now() - startTime });
      console.log('✅ EasyPost rates fetched:', easyPostResponse.rates?.length || 0);
    } else {
      console.warn('⚠️ EasyPost rates failed:', results[0].reason);
      degradedProviders.push('easypost');
      providerStatuses.push({ 
        provider: 'easypost', 
        available: false, 
        error: String(results[0].reason),
        latencyMs: Date.now() - startTime 
      });
    }

    // Process Shippo results
    if (results[1].status === 'fulfilled') {
      const shippoResponse = results[1].value;
      shippo_shipment = shippoResponse;
      
      if (shippoResponse.rates) {
        const shippoRates = shippoResponse.rates.map((rate: ShippoRate) => ({
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
        } as CombinedRate));
        combinedRates.push(...shippoRates);
      }

      providerStatuses.push({ provider: 'shippo', available: true, latencyMs: Date.now() - startTime });
      console.log('✅ Shippo rates fetched:', shippoResponse.rates?.length || 0);
    } else {
      console.warn('⚠️ Shippo rates failed:', results[1].reason);
      degradedProviders.push('shippo');
      providerStatuses.push({ 
        provider: 'shippo', 
        available: false, 
        error: String(results[1].reason),
        latencyMs: Date.now() - startTime 
      });
    }

    // Process Easyship results
    if (results[2].status === 'fulfilled') {
      const easyshipResponse = results[2].value;
      easyship_shipment = easyshipResponse;

      if (easyshipResponse.rates) {
        const easyshipRates = easyshipResponse.rates.map((rate: EasyshipRate) => ({
          id: rate.object_id,
          carrier: rate.courier_name,
          service: rate.service_name || rate.courier_name,
          rate: String(rate.total_charge),
          currency: rate.currency || 'USD',
          delivery_days: rate.delivery_days ?? rate.max_delivery_time ?? rate.min_delivery_time,
          delivery_date: null,
          delivery_date_guaranteed: false,
          est_delivery_days: rate.max_delivery_time ?? rate.min_delivery_time,
          provider: 'easyship' as const,
          original_rate: rate,
          // Carry shipment id so the purchase flow can pass it back
          easyship_shipment_id: easyshipResponse.object_id,
        } as CombinedRate));
        combinedRates.push(...easyshipRates);
      }

      providerStatuses.push({ provider: 'easyship', available: true, latencyMs: Date.now() - startTime });
      console.log('✅ Easyship rates fetched:', easyshipResponse.rates?.length || 0);
    } else {
      console.warn('⚠️ Easyship rates failed:', results[2].reason);
      degradedProviders.push('easyship');
      providerStatuses.push({
        provider: 'easyship',
        available: false,
        error: String(results[2].reason),
        latencyMs: Date.now() - startTime
      });
    }

    // Sort combined rates by price (guard against invalid/empty rate values)
    const getRateValue = (rate: { rate: string }) => {
      const parsed = Number.parseFloat(rate.rate);
      return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
    };
    combinedRates.sort((a, b) => getRateValue(a) - getRateValue(b));
    combinedSmartRates.sort((a, b) => getRateValue(a) - getRateValue(b));

    // Calculate ranked recommendations
    const rankedRecommendations = this.calculateRankedRecommendations(combinedRates);
    const degradedMode = degradedProviders.length > 0;
    const processingTimeMs = Date.now() - startTime;

    if (degradedMode) {
      console.warn(`⚠️ DEGRADED MODE: ${degradedProviders.join(', ')} unavailable`);
    }

    console.log('🎯 Rate shopping complete:', {
      total: combinedRates.length,
      degraded: degradedMode,
      cheapest: rankedRecommendations.cheapest?.carrier,
      fastest: rankedRecommendations.fastest?.carrier,
      bestValue: rankedRecommendations.bestValue?.carrier
    });

    const decisionMetadata: RateDecisionMetadata = {
      degradedMode,
      degradedProviders,
      providerStatuses,
      algorithmVersion: '1.0.0',
      rankedRecommendations,
      totalRatesReturned: combinedRates.length,
      processingTimeMs
    };

    return {
      id: `combined_${Date.now()}`,
      rates: combinedRates,
      smartRates: combinedSmartRates.length > 0 ? combinedSmartRates : undefined,
      easypost_shipment,
      shippo_shipment,
      easyship_shipment,
      decisionMetadata
    };
  }

  /**
   * Calculate cheapest, fastest, and best_value recommendations
   */
  private calculateRankedRecommendations(rates: CombinedRate[]): RankedRateRecommendations {
    if (!rates.length) {
      return {
        cheapest: null,
        fastest: null,
        bestValue: null,
        recommended: null,
        recommendedReasonCode: 'no_rates_available'
      };
    }

    // Cheapest: lowest rate
    const sortedByPrice = [...rates].sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));
    const cheapest: RankedRate = {
      rateId: sortedByPrice[0].id,
      carrier: sortedByPrice[0].carrier,
      service: sortedByPrice[0].service,
      rate: parseFloat(sortedByPrice[0].rate),
      estimatedDays: sortedByPrice[0].delivery_days || sortedByPrice[0].est_delivery_days || null,
      provider: sortedByPrice[0].provider,
      category: 'cheapest',
      score: 100
    };

    // Fastest: fewest delivery days
    const ratesWithDays = rates.filter(r => (r.delivery_days || r.est_delivery_days) != null);
    let fastest: RankedRate | null = null;
    if (ratesWithDays.length) {
      const sortedBySpeed = [...ratesWithDays].sort((a, b) => {
        const daysA = a.delivery_days || a.est_delivery_days || 999;
        const daysB = b.delivery_days || b.est_delivery_days || 999;
        return daysA - daysB;
      });
      fastest = {
        rateId: sortedBySpeed[0].id,
        carrier: sortedBySpeed[0].carrier,
        service: sortedBySpeed[0].service,
        rate: parseFloat(sortedBySpeed[0].rate),
        estimatedDays: sortedBySpeed[0].delivery_days || sortedBySpeed[0].est_delivery_days || null,
        provider: sortedBySpeed[0].provider,
        category: 'fastest',
        score: 100
      };
    }

    // Best value: composite score = normalize(price) * 0.6 + normalize(speed) * 0.4
    const minRate = Math.min(...rates.map(r => parseFloat(r.rate)));
    const maxRate = Math.max(...rates.map(r => parseFloat(r.rate)));
    const rateRange = maxRate - minRate || 1;

    const minDays = Math.min(...ratesWithDays.map(r => r.delivery_days || r.est_delivery_days || 7));
    const maxDays = Math.max(...ratesWithDays.map(r => r.delivery_days || r.est_delivery_days || 7));
    const dayRange = maxDays - minDays || 1;

    const scored = rates.map(r => {
      const priceScore = 1 - ((parseFloat(r.rate) - minRate) / rateRange);
      const days = r.delivery_days || r.est_delivery_days || maxDays;
      const speedScore = 1 - ((days - minDays) / dayRange);
      const compositeScore = (priceScore * 0.6) + (speedScore * 0.4);
      return { rate: r, score: compositeScore * 100 };
    }).sort((a, b) => b.score - a.score);

    const bestValue: RankedRate = {
      rateId: scored[0].rate.id,
      carrier: scored[0].rate.carrier,
      service: scored[0].rate.service,
      rate: parseFloat(scored[0].rate.rate),
      estimatedDays: scored[0].rate.delivery_days || scored[0].rate.est_delivery_days || null,
      provider: scored[0].rate.provider,
      category: 'best_value',
      score: scored[0].score
    };

    // Default recommendation is best_value
    const recommended = bestValue;
    const recommendedReasonCode = 'best_value_composite_score';

    return { cheapest, fastest, bestValue, recommended, recommendedReasonCode };
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

  private async getEasyshipRates(shipmentData: ShipmentRequest) {
    try {
      console.log('🌐 Fetching Easyship rates...');
      return await this.easyshipService.createShipment(shipmentData);
    } catch (error) {
      console.error('Easyship rate fetching failed:', error);
      throw error;
    }
  }
}

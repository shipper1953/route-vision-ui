import { supabase } from "@/integrations/supabase/client";

export interface EnhancedShipmentData {
  from_address: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
  };
  to_address: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
  };
  packages: {
    length: number;
    width: number;
    height: number;
    weight: number;
    description?: string;
    nmfc_code?: string;
    freight_class?: number;
  }[];
  company_id: string;
  user_id: string;
}

export interface EnhancedRateResponse {
  shipment_id: string;
  total_weight: number;
  package_count: number;
  strategy_used: {
    parcel: boolean;
    freight: boolean;
    hybrid: boolean;
  };
  quotes: EnhancedQuote[];
  cheapest_option: EnhancedQuote | null;
  total_options: number;
}

export interface EnhancedQuote {
  carrier: string;
  service: string;
  rate: number;
  estimated_days?: number;
  quote_type: 'parcel' | 'freight';
  savings_vs_individual?: number;
}

export class StrategicRateShoppingService {
  
  /**
   * Get comprehensive rates using strategic routing based on shipment characteristics
   */
  async getStrategicRates(shipmentData: EnhancedShipmentData): Promise<EnhancedRateResponse> {
    console.log('🚀 Starting strategic rate shopping...', {
      packages: shipmentData.packages.length,
      totalWeight: shipmentData.packages.reduce((sum, pkg) => sum + pkg.weight, 0)
    });

    try {
      const { data, error } = await supabase.functions.invoke('enhanced-rate-shopping', {
        body: { shipment_data: shipmentData }
      });

      if (error) {
        console.error('Strategic rate shopping error:', error);
        throw new Error(`Rate shopping failed: ${error.message}`);
      }

      console.log('✅ Strategic rate shopping successful:', {
        shipmentId: data.shipment_id,
        totalOptions: data.total_options,
        strategyUsed: data.strategy_used
      });

      return data;
    } catch (error) {
      console.error('Strategic rate shopping service error:', error);
      throw error;
    }
  }

  /**
   * Get stored quotes for a shipment
   */
  async getShipmentQuotes(shipmentId: number | string) {
    const { data, error } = await supabase
      .from('shipment_quotes')
      .select('*')
      .eq('shipment_id', typeof shipmentId === 'string' ? parseInt(shipmentId) : shipmentId)
      .order('rate', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch quotes: ${error.message}`);
    }

    return data;
  }

  /**
   * Select a quote for booking
   */
  async selectQuote(shipmentId: number | string, quoteId: string) {
    const numericShipmentId = typeof shipmentId === 'string' ? parseInt(shipmentId) : shipmentId;
    
    // Mark all quotes as unselected first
    await supabase
      .from('shipment_quotes')
      .update({ is_selected: false })
      .eq('shipment_id', numericShipmentId);

    // Mark the chosen quote as selected
    const { data, error } = await supabase
      .from('shipment_quotes')
      .update({ is_selected: true })
      .eq('id', quoteId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to select quote: ${error.message}`);
    }

    return data;
  }

  /**
   * Analyze shipment complexity and recommend strategy
   */
  analyzeShipmentComplexity(packages: any[]) {
    const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0);
    const totalPackages = packages.length;
    const maxDimension = Math.max(
      ...packages.flatMap(pkg => [pkg.length, pkg.width, pkg.height])
    );
    const totalVolume = packages.reduce((sum, pkg) => 
      sum + (pkg.length * pkg.width * pkg.height), 0
    );

    return {
      complexity: this.getComplexityScore(totalWeight, totalPackages, maxDimension),
      recommendations: {
        useParcel: totalWeight <= 150 && maxDimension <= 108,
        useFreight: totalWeight > 70 || maxDimension > 96 || totalPackages > 10,
        useHybrid: totalWeight > 50 && totalWeight <= 100,
        consolidationOpportunity: totalPackages > 3 && totalVolume < 20000
      },
      metrics: {
        totalWeight,
        totalPackages,
        maxDimension,
        totalVolume,
        avgPackageWeight: totalWeight / totalPackages
      }
    };
  }

  private getComplexityScore(weight: number, packages: number, maxDim: number): 'simple' | 'moderate' | 'complex' {
    let score = 0;
    
    if (weight > 100) score += 2;
    else if (weight > 50) score += 1;
    
    if (packages > 5) score += 2;
    else if (packages > 2) score += 1;
    
    if (maxDim > 96) score += 2;
    else if (maxDim > 48) score += 1;

    if (score >= 4) return 'complex';
    if (score >= 2) return 'moderate';
    return 'simple';
  }

  /**
   * Calculate potential savings from strategic routing
   */
  calculateStrategicSavings(quotes: EnhancedQuote[]): number {
    if (quotes.length < 2) return 0;

    const cheapest = Math.min(...quotes.map(q => q.rate));
    const mostExpensive = Math.max(...quotes.map(q => q.rate));
    
    return mostExpensive - cheapest;
  }

  /**
   * Get rate shopping analytics
   */
  async getRateShoppingAnalytics(companyId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: shipments } = await supabase
      .from('shipments')
      .select(`
        id,
        total_weight,
        package_count,
        created_at,
        shipment_quotes (
          carrier,
          service,
          rate,
          quote_type,
          is_selected
        )
      `)
      .eq('company_id', companyId)
      .gte('created_at', startDate.toISOString());

    if (!shipments) return null;

    const analytics = {
      totalShipments: shipments.length,
      avgPackagesPerShipment: shipments.reduce((sum, s) => sum + (s.package_count || 1), 0) / shipments.length,
      avgWeight: shipments.reduce((sum, s) => sum + (s.total_weight || 0), 0) / shipments.length,
      carrierDistribution: {} as Record<string, number>,
      avgSavingsPerShipment: 0,
      quoteTypeDistribution: { parcel: 0, freight: 0 }
    };

    let totalSavings = 0;
    
    shipments.forEach(shipment => {
      const quotes = shipment.shipment_quotes || [];
      const selectedQuote = quotes.find(q => q.is_selected);
      
      if (selectedQuote) {
        analytics.carrierDistribution[selectedQuote.carrier] = 
          (analytics.carrierDistribution[selectedQuote.carrier] || 0) + 1;
        
        analytics.quoteTypeDistribution[selectedQuote.quote_type as 'parcel' | 'freight']++;
        
        // Calculate savings vs most expensive option
        const maxRate = Math.max(...quotes.map(q => q.rate));
        totalSavings += maxRate - selectedQuote.rate;
      }
    });

    analytics.avgSavingsPerShipment = totalSavings / shipments.length;

    return analytics;
  }
}
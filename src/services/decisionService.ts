import { supabase } from "@/integrations/supabase/client";
import { DecisionExplanation, RateDecisionMetadata, CARTONIZATION_ALGORITHM_VERSION } from "./cartonization/types";

const RATE_ALGORITHM_VERSION = '1.0.0';

export interface DecisionSnapshot {
  company_id: string;
  order_id?: number;
  shipment_id?: number;
  decision_type: 'packaging' | 'rate';
  inputs_json: Record<string, any>;
  outputs_json: Record<string, any>;
  explanation: Record<string, any>;
  reason_code: string;
  algorithm_version: string;
  policy_version_id?: string;
  degraded_mode: boolean;
  degraded_providers?: string[];
  confidence?: number;
  processing_time_ms?: number;
  created_by?: string;
}

/**
 * Persists a packaging decision snapshot for audit trail
 */
export async function persistPackagingDecision(params: {
  companyId: string;
  orderId?: number;
  shipmentId?: number;
  items: any[];
  result: any;
  explanation: DecisionExplanation;
  userId?: string;
  policyVersionId?: string;
}): Promise<void> {
  try {
    const snapshot: DecisionSnapshot = {
      company_id: params.companyId,
      order_id: params.orderId,
      shipment_id: params.shipmentId,
      decision_type: 'packaging',
      inputs_json: {
        items: params.items.map(i => ({
          id: i.id,
          name: i.name,
          dimensions: { l: i.length, w: i.width, h: i.height },
          weight: i.weight,
          quantity: i.quantity
        }))
      },
      outputs_json: {
        recommendedBox: {
          id: params.result.recommendedBox?.id,
          name: params.result.recommendedBox?.name,
          dimensions: params.result.recommendedBox ? {
            l: params.result.recommendedBox.length,
            w: params.result.recommendedBox.width,
            h: params.result.recommendedBox.height
          } : null
        },
        utilization: params.result.utilization,
        confidence: params.result.confidence,
        alternativeCount: params.result.alternatives?.length || 0,
        isMultiPackage: !!params.result.multiPackageResult,
        packageCount: params.result.multiPackageResult?.totalPackages || 1
      },
      explanation: params.explanation as any,
      reason_code: params.explanation.reasonCode,
      algorithm_version: CARTONIZATION_ALGORITHM_VERSION,
      policy_version_id: params.policyVersionId,
      degraded_mode: false,
      confidence: Math.round(params.result.confidence),
      processing_time_ms: params.result.processingTime,
      created_by: params.userId
    };

    const { error } = await supabase
      .from('shipment_decisions')
      .insert(snapshot as any);

    if (error) {
      console.warn('Failed to persist packaging decision:', error);
    }
  } catch (e) {
    console.warn('Error persisting packaging decision:', e);
  }
}

/**
 * Persists a rate shopping decision snapshot for audit trail
 */
export async function persistRateDecision(params: {
  companyId: string;
  orderId?: number;
  shipmentId?: number;
  requestData: any;
  rates: any[];
  metadata: RateDecisionMetadata;
  selectedRateId?: string;
  userId?: string;
  policyVersionId?: string;
}): Promise<void> {
  try {
    const snapshot: DecisionSnapshot = {
      company_id: params.companyId,
      order_id: params.orderId,
      shipment_id: params.shipmentId,
      decision_type: 'rate',
      inputs_json: {
        fromZip: params.requestData?.from_address?.zip,
        toZip: params.requestData?.to_address?.zip,
        parcelCount: params.requestData?.parcels?.length || 1,
        weight: params.requestData?.parcels?.[0]?.weight
      },
      outputs_json: {
        totalRates: params.rates.length,
        selectedRateId: params.selectedRateId,
        rankedRecommendations: params.metadata.rankedRecommendations,
        providerBreakdown: {
          easypost: params.rates.filter(r => r.provider === 'easypost').length,
          shippo: params.rates.filter(r => r.provider === 'shippo').length
        }
      },
      explanation: {
        recommendedReasonCode: params.metadata.rankedRecommendations.recommendedReasonCode,
        providerStatuses: params.metadata.providerStatuses,
        algorithmVersion: RATE_ALGORITHM_VERSION
      },
      reason_code: params.metadata.rankedRecommendations.recommendedReasonCode,
      algorithm_version: RATE_ALGORITHM_VERSION,
      policy_version_id: params.policyVersionId,
      degraded_mode: params.metadata.degradedMode,
      degraded_providers: params.metadata.degradedProviders,
      confidence: params.metadata.degradedMode ? 70 : 95,
      processing_time_ms: params.metadata.processingTimeMs,
      created_by: params.userId
    };

    const { error } = await supabase
      .from('shipment_decisions')
      .insert(snapshot as any);

    if (error) {
      console.warn('Failed to persist rate decision:', error);
    }
  } catch (e) {
    console.warn('Error persisting rate decision:', e);
  }
}

/**
 * Records a user override of a recommendation
 */
export async function recordDecisionOverride(params: {
  decisionId: string;
  overrideReason: string;
  overrideCategory: string;
}): Promise<void> {
  try {
    const { error } = await supabase
      .from('shipment_decisions')
      .update({
        overridden: true,
        override_reason: params.overrideReason,
        override_category: params.overrideCategory
      } as any)
      .eq('id', params.decisionId);

    if (error) {
      console.warn('Failed to record override:', error);
    }
  } catch (e) {
    console.warn('Error recording override:', e);
  }
}

/**
 * Fetches tenant packaging policy
 */
export async function getTenantPackagingPolicy(companyId: string) {
  const { data, error } = await supabase
    .from('tenant_packaging_policies')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.warn('Error fetching packaging policy:', error);
    return null;
  }
  return data;
}

/**
 * Fetches tenant rate policy
 */
export async function getTenantRatePolicy(companyId: string) {
  const { data, error } = await supabase
    .from('tenant_rate_policies')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.warn('Error fetching rate policy:', error);
    return null;
  }
  return data;
}

/**
 * Fetches override reason options
 */
export async function getOverrideReasons(companyId: string, appliesTo?: 'packaging' | 'rate') {
  let query = supabase
    .from('shipment_override_reasons')
    .select('*')
    .eq('is_active', true)
    .or(`company_id.is.null,company_id.eq.${companyId}`);

  if (appliesTo) {
    query = query.or(`applies_to.eq.${appliesTo},applies_to.eq.both`);
  }

  const { data, error } = await query.order('label');
  if (error) {
    console.warn('Error fetching override reasons:', error);
    return [];
  }
  return data || [];
}

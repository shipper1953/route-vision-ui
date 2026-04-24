import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Item } from "@/services/cartonization/types";

export interface PackagingDecisionResult {
  recommended: {
    box_id: string;
    box_name: string;
    box: {
      id: string;
      name: string;
      length: number;
      width: number;
      height: number;
      max_weight: number;
      cost: number;
    };
    utilization: number;
    void_ratio: number;
    dimensional_weight: number;
    score: number;
    score_breakdown: Record<string, number>;
    confidence: number;
    reason_code: string;
  };
  alternatives: Array<{
    box_id: string;
    box_name: string;
    utilization: number;
    cost: number;
    score: number;
    score_breakdown: Record<string, number>;
  }>;
  rejected_candidates: Array<{
    box_id: string;
    box_name: string;
    reason: string;
    score: number;
  }>;
  multi_package?: {
    total_packages: number;
    total_cost: number;
    average_utilization: number;
    packages: Array<{
      box: any;
      items: Item[];
      utilization: number;
      dimensional_weight: number;
      void_ratio: number;
      total_weight: number;
    }>;
  };
  metadata: {
    algorithm_version: string;
    policy_version_id: string | null;
    optimization_objective: string;
    tie_breakers: string[];
    total_weight: number;
    total_volume: number;
    boxes_evaluated: number;
    has_fragile_items: boolean;
    target_utilization?: number;
  };
}

export const usePackagingDecision = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PackagingDecisionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getRecommendation = useCallback(
    async (items: Item[], orderId?: number): Promise<PackagingDecisionResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "packaging-decision",
          {
            body: {
              order_id: orderId ?? null,
              items: items.map((i) => ({
                id: i.id,
                name: i.name,
                length: i.length,
                width: i.width,
                height: i.height,
                weight: i.weight,
                quantity: i.quantity,
                fragility: i.fragility || "low",
                category: i.category || "general",
              })),
            },
          }
        );

        if (fnError) {
          throw new Error(fnError.message || "Edge function error");
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        setResult(data as PackagingDecisionResult);
        return data as PackagingDecisionResult;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to get packaging recommendation";
        setError(msg);
        console.error("Packaging decision error:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { getRecommendation, result, loading, error };
};

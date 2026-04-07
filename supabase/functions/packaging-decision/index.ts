import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALGORITHM_VERSION = "cartonization_v2.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface Item {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  quantity: number;
  fragility?: "low" | "medium" | "high";
  category?: string;
}

interface Box {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  max_weight: number;
  cost: number;
  box_type: string;
}

interface TenantPolicy {
  optimization_objective: string; // smallest_fit | lowest_landed_cost | damage_risk_min
  tie_breaker_order: string[];
  max_void_ratio: number;
  fragility_rules: Record<string, any>;
  policy_version_id: string | null;
}

interface BoxAnalysis {
  box: Box;
  utilization: number;
  dimensionalWeight: number;
  outerVolume: number;
  cost: number;
  voidRatio: number;
  itemsFit: boolean;
  score: number;
  scoreBreakdown: Record<string, number>;
}

interface RejectedCandidate {
  box_id: string;
  box_name: string;
  reason: string;
  score: number;
}

// ─── 3D Bin Packing (server-side port) ──────────────────────────────────────

function checkItemsFit(items: Item[], box: Box): { success: boolean; usedVolume: number } {
  // Geometric pre-check
  for (const item of items) {
    const itemDims = [item.length, item.width, item.height].sort((a, b) => b - a);
    const boxDims = [box.length, box.width, box.height].sort((a, b) => b - a);
    if (!itemDims.every((dim, i) => dim <= boxDims[i])) {
      return { success: false, usedVolume: 0 };
    }
  }

  // Expand by quantity
  const expanded: Item[] = [];
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      expanded.push({ ...item, quantity: 1 });
    }
  }

  const totalItemVolume = expanded.reduce(
    (sum, item) => sum + item.length * item.width * item.height,
    0
  );
  const boxVolume = box.length * box.width * box.height;

  // Practical packing factor check
  if (totalItemVolume / boxVolume / 0.75 > 1) {
    return { success: false, usedVolume: 0 };
  }

  // 3D bin packing (first-fit decreasing)
  const sorted = expanded.sort(
    (a, b) =>
      b.length * b.width * b.height - a.length * a.width * a.height
  );

  interface Space {
    x: number; y: number; z: number;
    length: number; width: number; height: number;
  }

  const spaces: Space[] = [
    { x: 0, y: 0, z: 0, length: box.length, width: box.width, height: box.height },
  ];

  let usedVolume = 0;

  for (const item of sorted) {
    let packed = false;
    for (let si = 0; si < spaces.length && !packed; si++) {
      const space = spaces[si];
      const orientations = [
        { l: item.length, w: item.width, h: item.height },
        { l: item.length, w: item.height, h: item.width },
        { l: item.width, w: item.length, h: item.height },
        { l: item.width, w: item.height, h: item.length },
        { l: item.height, w: item.length, h: item.width },
        { l: item.height, w: item.width, h: item.length },
      ];

      for (const o of orientations) {
        if (o.l <= space.length && o.w <= space.width && o.h <= space.height) {
          usedVolume += o.l * o.w * o.h;
          spaces.splice(si, 1);

          const newSpaces: Space[] = [];
          if (space.length - o.l > 0)
            newSpaces.push({ x: space.x + o.l, y: space.y, z: space.z, length: space.length - o.l, width: space.width, height: space.height });
          if (space.width - o.w > 0)
            newSpaces.push({ x: space.x, y: space.y + o.w, z: space.z, length: o.l, width: space.width - o.w, height: space.height });
          if (space.height - o.h > 0)
            newSpaces.push({ x: space.x, y: space.y, z: space.z + o.h, length: o.l, width: o.w, height: space.height - o.h });

          newSpaces.sort((a, b) => a.length * a.width * a.height - b.length * b.width * b.height);
          spaces.splice(si, 0, ...newSpaces);
          packed = true;
          break;
        }
      }
    }
    if (!packed) return { success: false, usedVolume: 0 };
  }

  return { success: true, usedVolume };
}

// ─── Scoring ────────────────────────────────────────────────────────────────

function scoreBox(
  analysis: Omit<BoxAnalysis, "score" | "scoreBreakdown">,
  policy: TenantPolicy,
  totalWeight: number,
  hasFragileItems: boolean
): { score: number; scoreBreakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};
  let score = 0;

  const objective = policy.optimization_objective;

  // Volume utilization score (0-40)
  const utilizationScore = Math.min(40, analysis.utilization * 0.4);
  breakdown.utilization = utilizationScore;
  score += utilizationScore;

  // Void ratio penalty
  const maxVoid = hasFragileItems
    ? policy.fragility_rules?.max_void_ratio ?? policy.max_void_ratio
    : policy.max_void_ratio;
  const voidPenalty = analysis.voidRatio > maxVoid ? -20 : 0;
  breakdown.void_penalty = voidPenalty;
  score += voidPenalty;

  // Objective-specific scoring
  if (objective === "smallest_fit") {
    // Prefer smallest outer volume
    const volumeScore = Math.max(0, 30 - analysis.outerVolume / 100);
    breakdown.volume_fit = volumeScore;
    score += volumeScore;
  } else if (objective === "lowest_landed_cost") {
    // Factor in box cost + estimated shipping (dim weight proxy)
    const costScore = Math.max(0, 30 - (analysis.cost + analysis.dimensionalWeight * 0.15));
    breakdown.landed_cost = costScore;
    score += costScore;
  } else if (objective === "damage_risk_min") {
    // Prefer tighter void ratio
    const damageScore = Math.max(0, 30 * (1 - analysis.voidRatio));
    breakdown.damage_risk = damageScore;
    score += damageScore;
  }

  // Weight safety margin (0-10)
  const weightRatio = totalWeight / analysis.box.max_weight;
  const weightScore = weightRatio <= 0.95 ? 10 : weightRatio <= 1.0 ? 5 : 0;
  breakdown.weight_safety = weightScore;
  score += weightScore;

  // Cost efficiency (0-10)
  const costEfficiency = Math.max(0, 10 - analysis.cost);
  breakdown.cost_efficiency = costEfficiency;
  score += costEfficiency;

  return { score, scoreBreakdown: breakdown };
}

function applyTieBreakers(
  a: BoxAnalysis,
  b: BoxAnalysis,
  tieBreakers: string[]
): number {
  for (const tb of tieBreakers) {
    let diff = 0;
    switch (tb) {
      case "smallest_volume":
        diff = a.outerVolume - b.outerVolume;
        break;
      case "lowest_dim_weight":
        diff = a.dimensionalWeight - b.dimensionalWeight;
        break;
      case "lowest_cost":
      case "lowest_box_cost":
        diff = a.cost - b.cost;
        break;
      case "highest_utilization":
        diff = b.utilization - a.utilization;
        break;
    }
    if (Math.abs(diff) > 0.01) return diff;
  }
  return 0;
}

// ─── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Get user's company
    const { data: userRow } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", userId)
      .single();

    if (!userRow?.company_id) {
      return new Response(JSON.stringify({ error: "User has no company" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const companyId = userRow.company_id;

    // Parse input
    const body = await req.json();
    const { order_id, items } = body as { order_id?: number; items: Item[] };

    if (!items?.length) {
      return new Response(JSON.stringify({ error: "items array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Load tenant packaging policy
    const { data: policyRow } = await supabase
      .from("tenant_packaging_policies")
      .select("*, policy_version_id")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const policy: TenantPolicy = policyRow
      ? {
          optimization_objective: policyRow.optimization_objective,
          tie_breaker_order: policyRow.tie_breaker_order || ["smallest_volume", "lowest_dim_weight", "lowest_cost"],
          max_void_ratio: policyRow.max_void_ratio ?? 0.6,
          fragility_rules: policyRow.fragility_rules || {},
          policy_version_id: policyRow.policy_version_id,
        }
      : {
          optimization_objective: "smallest_fit",
          tie_breaker_order: ["smallest_volume", "lowest_dim_weight", "lowest_cost"],
          max_void_ratio: 0.6,
          fragility_rules: {},
          policy_version_id: null,
        };

    // 2. Load company boxes
    const { data: boxes } = await supabase.rpc("get_company_boxes_for_cartonization", {
      p_company_id: companyId,
    });

    if (!boxes?.length) {
      return new Response(
        JSON.stringify({ error: "No active boxes found for company" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const DIM_WEIGHT_FACTOR = 139;
    const totalWeight = items.reduce((s, i) => s + i.weight * i.quantity, 0);
    const totalVolume = items.reduce(
      (s, i) => s + i.length * i.width * i.height * i.quantity,
      0
    );
    const hasFragileItems = items.some(
      (i) => i.fragility === "high" || i.fragility === "medium"
    );

    // 3. Evaluate each box
    const rejectedCandidates: RejectedCandidate[] = [];
    const analyses: BoxAnalysis[] = [];

    for (const box of boxes as Box[]) {
      // Weight check
      if (box.max_weight < totalWeight) {
        rejectedCandidates.push({
          box_id: box.id,
          box_name: box.name,
          reason: `Weight exceeds capacity (${totalWeight.toFixed(1)} > ${box.max_weight} lbs)`,
          score: 0,
        });
        continue;
      }

      // 3D fit check
      const packResult = checkItemsFit(items, box);
      if (!packResult.success) {
        rejectedCandidates.push({
          box_id: box.id,
          box_name: box.name,
          reason: "Items do not fit geometrically (3D packing failed)",
          score: 0,
        });
        continue;
      }

      const outerVolume = box.length * box.width * box.height;
      const utilization = (packResult.usedVolume / outerVolume) * 100;
      const voidRatio = 1 - packResult.usedVolume / outerVolume;
      const dimensionalWeight = outerVolume / DIM_WEIGHT_FACTOR;

      const partialAnalysis = {
        box,
        utilization,
        dimensionalWeight,
        outerVolume,
        cost: box.cost,
        voidRatio,
        itemsFit: true,
      };

      const { score, scoreBreakdown } = scoreBox(
        partialAnalysis,
        policy,
        totalWeight,
        hasFragileItems
      );

      analyses.push({ ...partialAnalysis, score, scoreBreakdown });
    }

    if (!analyses.length) {
      return new Response(
        JSON.stringify({
          error: "No boxes can fit the items",
          rejected_candidates: rejectedCandidates,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Sort by score, then apply deterministic tie-breakers
    analyses.sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (Math.abs(scoreDiff) > 0.5) return scoreDiff;
      return applyTieBreakers(a, b, policy.tie_breaker_order);
    });

    // Add non-selected fitting boxes to rejected list
    for (let i = 1; i < analyses.length; i++) {
      rejectedCandidates.push({
        box_id: analyses[i].box.id,
        box_name: analyses[i].box.name,
        reason: `Lower score than ${analyses[0].box.name} (${analyses[i].score.toFixed(1)} vs ${analyses[0].score.toFixed(1)})`,
        score: analyses[i].score,
      });
    }

    const recommended = analyses[0];
    const alternatives = analyses.slice(1, 4).map((a) => ({
      box_id: a.box.id,
      box_name: a.box.name,
      utilization: a.utilization,
      cost: a.cost,
      score: a.score,
      score_breakdown: a.scoreBreakdown,
    }));

    // Determine reason code
    let reasonCode = "optimal_fit";
    if (recommended.utilization >= 90) reasonCode = "tight_fit";
    else if (recommended.utilization >= 70) reasonCode = "good_fit";
    else if (recommended.utilization >= 50) reasonCode = "acceptable_fit";
    else reasonCode = "loose_fit";

    const confidence = Math.min(100, Math.round(recommended.score));

    // 5. Persist to order_cartonization if order_id provided
    if (order_id) {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await serviceClient.from("order_cartonization").upsert(
        {
          order_id,
          recommended_box_id: recommended.box.id,
          recommended_box_data: {
            id: recommended.box.id,
            name: recommended.box.name,
            length: recommended.box.length,
            width: recommended.box.width,
            height: recommended.box.height,
            max_weight: recommended.box.max_weight,
            cost: recommended.box.cost,
          },
          utilization: recommended.utilization,
          confidence,
          total_weight: totalWeight,
          items_weight: totalWeight,
          box_weight: 0,
          optimization_objective: policy.optimization_objective,
          score_breakdown: recommended.scoreBreakdown,
          rejected_candidates: rejectedCandidates.slice(0, 20),
          policy_version_id: policy.policy_version_id,
          algorithm_version: ALGORITHM_VERSION,
          calculation_timestamp: new Date().toISOString(),
        },
        { onConflict: "order_id" }
      );
    }

    // 6. Return response
    const result = {
      recommended: {
        box_id: recommended.box.id,
        box_name: recommended.box.name,
        box: recommended.box,
        utilization: recommended.utilization,
        void_ratio: recommended.voidRatio,
        dimensional_weight: recommended.dimensionalWeight,
        score: recommended.score,
        score_breakdown: recommended.scoreBreakdown,
        confidence,
        reason_code: reasonCode,
      },
      alternatives,
      rejected_candidates: rejectedCandidates.slice(0, 10),
      metadata: {
        algorithm_version: ALGORITHM_VERSION,
        policy_version_id: policy.policy_version_id,
        optimization_objective: policy.optimization_objective,
        tie_breakers: policy.tie_breaker_order,
        total_weight: totalWeight,
        total_volume: totalVolume,
        boxes_evaluated: (boxes as Box[]).length,
        has_fragile_items: hasFragileItems,
      },
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Packaging decision error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

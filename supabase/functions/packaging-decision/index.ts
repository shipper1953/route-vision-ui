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
// Target: utilization as close to 99% as possible without exceeding.
// Identical behavior across all tenants — policy is informational only.

const MAX_UTILIZATION = 99;

function scoreBox(
  analysis: Omit<BoxAnalysis, "score" | "scoreBreakdown">
): { score: number; scoreBreakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};
  // Primary metric: negative distance from 99% (closer to 99 = higher score)
  const distance = Math.abs(MAX_UTILIZATION - analysis.utilization);
  const score = -distance;
  breakdown.utilization = analysis.utilization;
  breakdown.distance_from_target = distance;
  breakdown.target_utilization = MAX_UTILIZATION;
  return { score, scoreBreakdown: breakdown };
}

// Deterministic tie-breakers, identical for all tenants:
// 1) lowest dimensional weight, 2) lowest box cost, 3) smallest outer volume
function applyTieBreakers(a: BoxAnalysis, b: BoxAnalysis): number {
  if (Math.abs(a.dimensionalWeight - b.dimensionalWeight) > 0.01) {
    return a.dimensionalWeight - b.dimensionalWeight;
  }
  if (Math.abs(a.cost - b.cost) > 0.01) {
    return a.cost - b.cost;
  }
  return a.outerVolume - b.outerVolume;
}

// Build a BoxAnalysis for a given item set + box, returns null if it doesn't fit
function analyzeBoxForItems(items: Item[], box: Box, totalWeight: number): BoxAnalysis | null {
  if (box.max_weight < totalWeight) return null;
  const packResult = checkItemsFit(items, box);
  if (!packResult.success) return null;

  const outerVolume = box.length * box.width * box.height;
  const utilization = (packResult.usedVolume / outerVolume) * 100;
  // Reject any box that would exceed 99% utilization
  if (utilization > MAX_UTILIZATION) return null;

  const voidRatio = 1 - packResult.usedVolume / outerVolume;
  const dimensionalWeight = outerVolume / 139;

  const partial = {
    box,
    utilization,
    dimensionalWeight,
    outerVolume,
    cost: box.cost,
    voidRatio,
    itemsFit: true,
  };
  const { score, scoreBreakdown } = scoreBox(partial);
  return { ...partial, score, scoreBreakdown };
}

// Pick the best box for a set of items: closest to 99% utilization, then tie-breakers
function pickBestBox(items: Item[], boxes: Box[]): BoxAnalysis | null {
  const totalWeight = items.reduce((s, i) => s + i.weight * i.quantity, 0);
  const candidates: BoxAnalysis[] = [];
  for (const box of boxes) {
    const a = analyzeBoxForItems(items, box, totalWeight);
    if (a) candidates.push(a);
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (Math.abs(scoreDiff) > 0.0001) return scoreDiff;
    return applyTieBreakers(a, b);
  });
  return candidates[0];
}

// ─── Multi-package splitter ────────────────────────────────────────────────
// Greedy: expand items by quantity, sort by volume desc, fill packages one
// at a time choosing the box that keeps utilization closest to 99%.

interface PackageResult {
  box: Box;
  items: Item[];
  utilization: number;
  dimensional_weight: number;
  void_ratio: number;
  total_weight: number;
}

function buildMultiPackages(items: Item[], boxes: Box[]): PackageResult[] | null {
  // Expand items to unit quantities so the splitter can mix
  const units: Item[] = [];
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      units.push({ ...item, quantity: 1 });
    }
  }
  // Sort by volume desc
  units.sort(
    (a, b) => b.length * b.width * b.height - a.length * a.width * a.height
  );

  const packages: PackageResult[] = [];
  let remaining = [...units];
  let safety = 0;

  while (remaining.length > 0 && safety++ < 1000) {
    // Start a new package with the largest remaining item
    let current: Item[] = [remaining[0]];
    let bestBox = pickBestBox(current, boxes);
    if (!bestBox) {
      // Single item cannot fit any box — abort
      return null;
    }
    let pool = remaining.slice(1);

    // Greedily try to add more items, keeping the box choice that's closest to 99%
    let progress = true;
    while (progress) {
      progress = false;
      for (let i = 0; i < pool.length; i++) {
        const trial = [...current, pool[i]];
        const trialBox = pickBestBox(trial, boxes);
        if (trialBox) {
          current = trial;
          bestBox = trialBox;
          pool.splice(i, 1);
          progress = true;
          break;
        }
      }
    }

    const totalWeight = current.reduce((s, i) => s + i.weight * i.quantity, 0);
    packages.push({
      box: bestBox.box,
      items: current,
      utilization: bestBox.utilization,
      dimensional_weight: bestBox.dimensionalWeight,
      void_ratio: bestBox.voidRatio,
      total_weight: totalWeight,
    });
    remaining = pool;
  }

  if (remaining.length > 0) return null;
  return packages;
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

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

    // 3. Evaluate each box (single-package candidates, ≤99% utilization)
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

      // Reject anything above the 99% safety cap
      if (utilization > MAX_UTILIZATION) {
        rejectedCandidates.push({
          box_id: box.id,
          box_name: box.name,
          reason: `Utilization ${utilization.toFixed(1)}% exceeds ${MAX_UTILIZATION}% cap`,
          score: 0,
        });
        continue;
      }

      const partialAnalysis = {
        box,
        utilization,
        dimensionalWeight,
        outerVolume,
        cost: box.cost,
        voidRatio,
        itemsFit: true,
      };

      const { score, scoreBreakdown } = scoreBox(partialAnalysis);
      analyses.push({ ...partialAnalysis, score, scoreBreakdown });
    }

    // 4. If no single box works, attempt multi-package fallback
    if (!analyses.length) {
      const multiPackages = buildMultiPackages(items, boxes as Box[]);
      if (!multiPackages || multiPackages.length === 0) {
        return new Response(
          JSON.stringify({
            error: "No boxes can fit the items (single or multi-package)",
            rejected_candidates: rejectedCandidates,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const totalCost = multiPackages.reduce((s, p) => s + p.box.cost, 0);
      const avgUtilization =
        multiPackages.reduce((s, p) => s + p.utilization, 0) / multiPackages.length;
      const confidence = Math.max(
        0,
        Math.min(100, Math.round(100 - Math.abs(MAX_UTILIZATION - avgUtilization)))
      );

      const primary = multiPackages[0];
      const primaryBox = primary.box;

      if (order_id) {
        const serviceClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await serviceClient.from("order_cartonization").upsert(
          {
            order_id,
            recommended_box_id: primaryBox.id,
            recommended_box_data: {
              id: primaryBox.id,
              name: primaryBox.name,
              length: primaryBox.length,
              width: primaryBox.width,
              height: primaryBox.height,
              max_weight: primaryBox.max_weight,
              cost: primaryBox.cost,
            },
            utilization: primary.utilization,
            confidence,
            total_weight: totalWeight,
            items_weight: totalWeight,
            box_weight: 0,
            optimization_objective: policy.optimization_objective,
            score_breakdown: { target_utilization: MAX_UTILIZATION, average_utilization: avgUtilization },
            rejected_candidates: rejectedCandidates.slice(0, 20),
            policy_version_id: policy.policy_version_id,
            algorithm_version: ALGORITHM_VERSION,
            calculation_timestamp: new Date().toISOString(),
            packages: multiPackages,
            total_packages: multiPackages.length,
            splitting_strategy: "greedy_99_target",
          },
          { onConflict: "order_id" }
        );
      }

      return new Response(
        JSON.stringify({
          recommended: {
            box_id: primaryBox.id,
            box_name: primaryBox.name,
            box: primaryBox,
            utilization: primary.utilization,
            void_ratio: primary.void_ratio,
            dimensional_weight: primary.dimensional_weight,
            score: -Math.abs(MAX_UTILIZATION - primary.utilization),
            score_breakdown: { target_utilization: MAX_UTILIZATION },
            confidence,
            reason_code: "multi_package_required",
          },
          multi_package: {
            total_packages: multiPackages.length,
            total_cost: totalCost,
            average_utilization: avgUtilization,
            packages: multiPackages,
          },
          alternatives: [],
          rejected_candidates: rejectedCandidates.slice(0, 10),
          metadata: {
            algorithm_version: ALGORITHM_VERSION,
            policy_version_id: policy.policy_version_id,
            optimization_objective: policy.optimization_objective,
            tie_breakers: ["distance_from_99", "lowest_dim_weight", "lowest_cost", "smallest_volume"],
            total_weight: totalWeight,
            total_volume: totalVolume,
            boxes_evaluated: (boxes as Box[]).length,
            has_fragile_items: hasFragileItems,
            target_utilization: MAX_UTILIZATION,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Sort by closest-to-99 score, then deterministic tie-breakers
    analyses.sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (Math.abs(scoreDiff) > 0.0001) return scoreDiff;
      return applyTieBreakers(a, b);
    });

    // Add non-selected fitting boxes to rejected list
    for (let i = 1; i < analyses.length; i++) {
      rejectedCandidates.push({
        box_id: analyses[i].box.id,
        box_name: analyses[i].box.name,
        reason: `Further from ${MAX_UTILIZATION}% target than ${analyses[0].box.name} (${analyses[i].utilization.toFixed(1)}% vs ${analyses[0].utilization.toFixed(1)}%)`,
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

    let reasonCode = "loose_fit";
    if (recommended.utilization >= 95) reasonCode = "near_target_fit";
    else if (recommended.utilization >= 85) reasonCode = "good_fit";
    else if (recommended.utilization >= 60) reasonCode = "acceptable_fit";

    const confidence = Math.max(
      0,
      Math.min(100, Math.round(100 - Math.abs(MAX_UTILIZATION - recommended.utilization)))
    );

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
          packages: [],
          total_packages: 1,
        },
        { onConflict: "order_id" }
      );
    }

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
        tie_breakers: ["distance_from_99", "lowest_dim_weight", "lowest_cost", "smallest_volume"],
        total_weight: totalWeight,
        total_volume: totalVolume,
        boxes_evaluated: (boxes as Box[]).length,
        has_fragile_items: hasFragileItems,
        target_utilization: MAX_UTILIZATION,
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

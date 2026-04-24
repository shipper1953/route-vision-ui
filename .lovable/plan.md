
# Make cartonization target ~99% utilization (single + multi-package)

## Goal

For both:
- **Order intake** (when an order is created/imported)
- **Package management section** of the shipment creation flow

…the recommended box must always be the one whose **volume utilization is as close to 99% as possible without exceeding it**, where utilization = (sum of item cubic dimensions) ÷ (box cubic dimensions). If no single box can fit all items at ≤99% utilization, the system must automatically split into multiple packages, applying the same "as close to 99% as possible" rule per package.

## Root cause

Two separate code paths recommend boxes today and they disagree:

### 1. Server-side (`supabase/functions/packaging-decision/index.ts`) — primary path
This is the function called by `useRecommendedBox` in the package management section AND used as the source of truth for orders that hit the edge function.

- Default `optimization_objective` is `smallest_fit` (line 312), which prefers the smallest outer-volume box, **not** the box closest to 99% utilization.
- The score formula caps utilization contribution at 40 points (`Math.min(40, utilization * 0.4)`), so a 95%-utilized box and a 99%-utilized box both score 40 — they tie on utilization, then "smallest outer volume" or "lowest cost" picks among them. This frequently picks a slightly oversized box because the score doesn't distinguish 95% vs 99%.
- The function never attempts a multi-package fallback. If items don't fit any single box, it returns an error rather than splitting across packages.

### 2. Client-side (`src/services/cartonization/cartonizationEngine.ts`) — fallback + order intake
- `calculateOptimalBox` already sorts by highest utilization ≤ 99% (correct), then falls back to multi-package — good.
- BUT `orderCreationService.ts` only triggers multi-package when `confidence < 60`, not when single-box utilization > 99% / no single box fits, so the trigger condition is wrong.
- `MultiPackageAlgorithm.findOptimalBoxForGroup` picks the **smallest fitting box** (sorts ascending by volume, returns first fit). That is "tightest fit by volume" but does not specifically target 99% — it is implicitly close, but inconsistent with the single-box rule.

## Plan

### 1. Rewrite scoring in `packaging-decision` edge function
File: `supabase/functions/packaging-decision/index.ts`

- Replace the current weighted score (`scoreBox`) with a **utilization-distance-from-99%** primary metric:
  - `primary = -|99 - utilization|` for boxes with utilization ≤ 99
  - any box with utilization > 99 is rejected (capacity overshoot — unsafe geometric fit)
- Tie-breakers (deterministic), in order:
  1. lowest dimensional weight
  2. lowest box cost
  3. smallest outer volume
- Remove `optimization_objective` branching from selection (keep the field in metadata for traceability only, since the user wants identical behavior for all companies).
- Keep the 3D bin-packing fit check unchanged.
- Keep weight-capacity rejection unchanged.
- `confidence` becomes a function of how close utilization is to 99% (e.g., `100 - |99 - utilization|` clamped to 0–100).

### 2. Add multi-package fallback to the edge function
File: `supabase/functions/packaging-decision/index.ts`

When **no single box** can fit all items at utilization ≤ 99%:
- Run a server-side multi-package splitter that:
  1. Sorts items by volume desc.
  2. Greedy-assigns items into the current package, choosing per-step the box that yields the highest utilization ≤ 99% containing the running set.
  3. When adding the next item would push the chosen box past 99% or break geometric fit, finalize the current package and start a new one.
  4. Continues until all items are assigned.
- Returns the multi-package result in the response under a new `multi_package` field with per-package box, items, utilization (each package independently targeting ~99%).

This keeps the rule consistent: every package targets the same closest-to-99% objective.

### 3. Align the client engine with the same rule
File: `src/services/cartonization/cartonizationEngine.ts`

- `sortBoxesByOptimization` already sorts highest utilization first; change it to sort by **distance from 99%** instead so a 99% box always wins over a 100% (rejected) and a 95% box.
- Keep the existing `MAX_SINGLE_PACKAGE_UTILIZATION = 99` cap and existing tie-breakers.
- The single-box → multi-package fallback in `calculateOptimalBox` already triggers when `utilizationCappedBoxes` is empty — keep that.

### 4. Fix multi-package per-package selection
File: `src/services/cartonization/multiPackageAlgorithm.ts`

- In `findOptimalBoxForGroup`, replace "first fit smallest box" with "best fit closest to 99% utilization without exceeding":
  - Iterate all boxes that pass weight + 3D fit.
  - Score by `-|99 - utilization|`, reject any > 99%.
  - Apply the same tie-breakers as the single-box path.
- Tighten `splitByVolume` so the target per-group volume is `0.99 × selected_box_volume` instead of `0.80 × median_box_volume` (so groups are sized to hit 99% in the chosen box).

### 5. Fix the trigger for multi-package on order intake
File: `src/services/orderCreationService.ts` (and `src/utils/recalculateOrderCartonization.ts`, `src/services/bulkShipping/orderProcessor.ts`)

Today multi-package is only attempted when `result.confidence < 60`. Replace with:
- Multi-package is attempted when `calculateOptimalBox(items, false)` returns `null` (i.e., no single box fits at ≤ 99%).
- Pass `optimizationObjective: 'balanced'` (which under the new logic still yields per-package ~99%).

### 6. Surface utilization clearly in the UI
File: `src/components/shipment/package/RecommendedBoxCard.tsx` (verify & adjust if needed)
- Show "Utilization: 97.4% (target ≤ 99%)" so packers can see how close to the rule the recommendation is. No structural redesign — just ensure the displayed utilization comes from the new field consistently for both single- and multi-package results.

### 7. Tenant-policy compatibility
- `tenant_packaging_policies.optimization_objective` becomes informational only for selection. We keep storing/reading it for backwards compatibility and audit, but the selection logic ignores it. This is per the user's explicit ask: "everything to function the same way for all companies."

## Out of scope
- No DB schema changes.
- No changes to bin-packing geometric fit logic.
- No carrier/rate logic changes.
- No backfill of historical orders (existing `order_cartonization` rows remain; new orders / re-runs use the new logic).

## Files to update
- `supabase/functions/packaging-decision/index.ts`
- `src/services/cartonization/cartonizationEngine.ts`
- `src/services/cartonization/multiPackageAlgorithm.ts`
- `src/services/orderCreationService.ts`
- `src/utils/recalculateOrderCartonization.ts`
- `src/services/bulkShipping/orderProcessor.ts`
- `src/components/shipment/package/RecommendedBoxCard.tsx` (display only, if needed)

## Validation after implementation
- Single-item small order → recommends the smallest box at ~95–99% utilization, not the next-size-up.
- Multi-item order whose total volume = 80% of a medium box → recommends the medium box (≈80%), not a smaller box that geometrically can't fit.
- Multi-item order whose total volume > 99% of every available box → returns multi-package, with each package independently at ≤99% utilization, closest to 99%.
- Behavior is identical across tenants (no policy-driven divergence in box selection).

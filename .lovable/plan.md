## Problem

The Packaging Opportunities calculator has three correctness bugs that make its results unreliable. It's running and producing data (current report: 129 shipments analyzed, 10 opportunities, $149.97 savings for the Demo company), but the math behind those numbers is wrong in important ways.

### What's wrong today

In `supabase/functions/generate-packaging-intelligence/index.ts`:

1. **"Actual" utilization uses the wrong dimensions.** It reads `shipments.package_dimensions` (free-form JSON often containing label dims, not the real used box). Example from the data: shipment 447 has `actual_package_sku = S-20474` (a 24x16x12 master box) but `package_dimensions = {24,16,12}` — coincidence here, but on shipment 446 the SKU `S-19858` is a 10x10x8 master box and the saved dims were `{10,10,8}` — fine. The bug shows up when users override dims at the label step. We should always look up the real interior dimensions of `actual_package_sku` from `packaging_master_list` (or `boxes`) and use those as the "actual" baseline.

2. **The selection logic doesn't find the optimal box.** It only proposes a master-list box if its utilization is *higher than the actual* AND `<= 95%`. That means:
   - If the actual box is already small (say 90% utilization), it will only suggest something between 91-95% — usually nothing.
   - It never proposes a box that fits more snugly when the actual was *oversized* unless that snugger box also happens to clear an arbitrary 95% ceiling.
   - The "fit" check is volume-only (`totalItemVolume <= boxVolume`). It does not check that each item's longest side fits in the box, so it can recommend a box that's mathematically smaller in volume but physically can't hold a long item. Example: shipment with a 14" item could be "fit" into a 12x12x8 box because volume math passes.
   
   Correct rule: among all master boxes where every item physically fits (per-dimension check, not just volume), pick the one with the **smallest interior volume that still holds the items** — that's the one closest to 100% utilization without going over.

3. **Self-recommendation noise.** When the actual box already is in `packaging_master_list`, the loop can pick that same SKU as the "best." It should skip the actual SKU and only surface a *different* box that beats it.

Smaller issues:
- `total_savings = improvement * 0.10` is a made-up constant and isn't tied to anything (cost difference, dim-weight savings, etc.). It should at minimum reflect the cost delta between the actual box and the recommended box × shipment count.
- Opportunities list is sorted by `shipment_count` only, so a box that helps 7 low-utilization shipments outranks a box that would save more money on 3 shipments. Sort by `total_savings` desc instead.
- The `boxes` table (company inventory) is ignored entirely. The user's request implies comparing against the U-Line master list, which is correct — but we should also use the company's existing `boxes` for the "actual" dimension lookup as a fallback, since some shipments use a custom company box that isn't in `packaging_master_list`.

## What we'll change

**File: `supabase/functions/generate-packaging-intelligence/index.ts`**

1. **Resolve "actual" box dimensions properly.** For each shipment, look up `actual_package_sku` first in `packaging_master_list` (vendor_sku match), then fall back to `boxes` for the company. Use those as the actual interior dims. Only fall back to `package_dimensions` if no SKU match is found.

2. **Rewrite the optimization rule.** Replace the current "higher utilization, ≤95%" filter with:
   - Run a real fit check: every item's three dims (sorted desc) must each fit in the box's three dims (sorted desc), i.e. simple bounding-box rotation check per item. (Keeping it per-item is intentional — we already lack a true 3D bin-packer here.)
   - Volume check: sum of item volumes ≤ box volume × 0.95 (5% slack for void fill).
   - Among master boxes that satisfy both checks AND have `vendor_sku <> actual_package_sku`, pick the one with the smallest interior volume. That's the highest utilization without overflow.
   - Only flag as an "opportunity" if the new utilization beats the actual by at least 10 percentage points (avoid noise from near-equivalent boxes).

3. **Fix savings math.** `savings_per_shipment = max(0, actual_box_cost - recommended_box_cost)`. Sum across shipments. If the actual box's cost isn't known, fall back to a small cubic-foot-based estimate but flag `cost_basis: 'estimated'` in the row so the UI can label it.

4. **Sort by `total_savings` desc** (tiebreak by `shipment_count` desc).

5. **Output schema stays the same** (`top_5_box_discrepancies` array of `{master_box_sku, master_box_name, shipment_count, avg_current_utilization, avg_new_utilization, total_savings, ...}`) so the dashboard and the dashboard-card hook keep working without UI changes.

6. Fix the small TS build error on line 326 (typed accumulator for `projected_packaging_need`) flagged by the latest build.

**No DB migration, no UI changes, no schema changes.** After the function is redeployed, the user clicks "Refresh Report" on `/packaging?tab=box-recommendations` and the recomputed opportunities appear.

### Validation plan

After deploying, I'll:
1. Re-invoke `generate-packaging-intelligence` for the Demo company.
2. Spot-check 3 shipments via SQL: confirm the "actual" dims now match the master-list dims for the SKU used, the recommended box actually fits all items per dimension, and the savings number equals the cost delta × shipment count.
3. Confirm the opportunities list is sorted by savings and excludes any opportunity whose `master_box_sku` equals the `actual_package_sku` of its sample shipments.

### Out of scope (will mention but not change unless you ask)

- The 95% volume cap and 10pp improvement threshold are tunable; happy to make them company-level settings later.
- A real 3D bin packer (vs. per-item dim check) would be more accurate for multi-item shipments but is a much bigger change.
- The Dashboard "Box Opportunities" widget already reads from the same report, so it'll improve automatically.

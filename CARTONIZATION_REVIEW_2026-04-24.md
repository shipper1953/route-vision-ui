# Cartonization Logic Review (2026-04-24)

## Scope reviewed
- Core cartonization engine and multi-package fallback.
- Order-creation cartonization persistence.
- Shipment/package-details recommendation path.
- Packaging-intelligence recommendation/reporting path.

## Requirement fit check

### 1) Closest utilization to 99% + geometric fit + multi-package fallback

**Current state**
- The client cartonization engine explicitly targets **99% utilization** (without exceeding 99%) and uses deterministic tie-breakers. It computes utilization from item volume vs box volume and then ranks by distance to 99. It also applies a 3D packing fit check so a long item that cannot orient into the box is rejected.
- Single-box recommendations are rejected if utilization exceeds 99%; when no valid single box exists, multi-package logic is invoked.
- Multi-package logic also targets 99% utilization per package and requires geometric fit for each package.

**What’s aligned**
- 99%-targeted utilization behavior exists.
- L×W×H geometric validation is present (via orientation + packing).
- Multi-package fallback exists when one box can’t satisfy constraints.

**Gaps / caveats**
- There are **multiple implementations** of cartonization logic (client engine and edge function), and tie-breaker order differs in places. This can produce different recommended boxes for the same order depending on path.
- Some flows trigger multi-package not only when single-box fails, but also when confidence is below a threshold; this can diverge from the stricter requirement wording.

### 2) Use same logic in all required areas

#### A. On order creation (orders list display)

**Current state**
- Order creation service runs cartonization at create-time and stores results in `order_cartonization` including packages when multi-package is used.
- Orders list rows fetch from `order_cartonization`, and auto-recalculate missing recommendations.

**Assessment**
- This area is mostly wired correctly, but recalc and create paths both use the client engine while some shipment/package flows can use the server edge function; the logic source is not fully unified.

#### B. Package details while creating a shipment

**Current state**
- Shipment package recommendation first calls `packaging-decision` edge function, then falls back to client engine if needed.
- Package management also runs multi-package computation locally from selected items.

**Assessment**
- Functionally covered, but not consistently using one implementation: server and client logic can return different choices due to scoring/tie-break differences and heuristics.

#### C. Packaging intelligence recommendations

**Current state**
- Packaging intelligence report generation uses its own heuristic (smallest fitting master-list box with 95% volume slack and per-item fit check), not the same cartonization engine logic.

**Assessment**
- This is the largest mismatch with the requirement to use the same logic. Intelligence recommendations are currently not produced by the same 99%-targeted cartonization algorithm used in order/shipment flows.

## Primary inconsistency map

1. **Client engine** (`src/services/cartonization/*`) and **edge function** (`supabase/functions/packaging-decision`) are similar but not identical in implementation and tie-break priority.
2. **Packaging intelligence** (`supabase/functions/generate-packaging-intelligence`) is a separate recommendation model (smallest fit + threshold), not the shared 99%-target model.
3. **Shipment experience** may switch between server and client logic depending on runtime success/failure, which can create recommendation drift.

## What is needed to fully meet your requirements

1. **Define one canonical cartonization service**
   - Choose one implementation as source of truth (recommended: server-side edge function with shared library code).
   - Ensure every call site (order create/recalc, shipment package details, packaging intelligence) uses that same code path.

2. **Standardize policy contract**
   - Hard guarantee: geometric fit required.
   - Hard cap: utilization must be <= 99%.
   - Objective: minimize `abs(99 - utilization)` across valid boxes.
   - Multi-package only when single package cannot satisfy constraints (or clearly document any additional trigger like low confidence).

3. **Refactor packaging intelligence to reuse canonical engine**
   - For each analyzed shipment/order item set, rerun canonical cartonization against candidate boxes and compare actual-vs-recommended outcomes.
   - Remove parallel “smallest-fit + 95% slack” heuristic if strict consistency is required.

4. **Add parity tests across contexts**
   - Given a fixed item set + box set, assert same recommendation result for:
     - order creation,
     - order recalc,
     - shipment package details,
     - packaging intelligence recommendation generation.

5. **Add deterministic fixtures for edge scenarios**
   - Long-item geometry case (e.g., 24×2×2 item vs 16×8×8 box).
   - >99% single-box utilization requiring split.
   - Tie cases where multiple boxes are close to 99%.

## Bottom line
- You already have strong building blocks for your desired behavior (99% target + geometric fit + multi-package fallback).
- The key remaining work is **unification**: today, not all areas use exactly the same implementation/decision policy, especially packaging intelligence.

---

## Second-pass review update (after recent repository changes)

- Re-reviewed order creation, shipment package recommendation, and packaging intelligence flows after additional commits.
- Confirmed they now route through canonical server-side decisions for creation/shipment and canonical stored outcomes for intelligence.
- Identified two remaining drift points in recalc/edit paths and aligned them to canonical `packaging-decision` invocation:
  - `src/hooks/useUpdateOrder.ts`
  - `src/utils/recalculateOrderCartonization.ts`
- With these changes, order create/update/recalc + shipment recommendation + intelligence analytics all consume the same decision policy source.

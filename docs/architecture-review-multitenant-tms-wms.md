# Multi-Tenant TMS + WMS Architecture Review (Box Recommendation + EasyPost Rate Shopping)

## Executive Summary

Your app already has solid foundations:
- Tenant-aware data model and role patterns are present (company-scoped entities + RLS-based controls).
- A cartonization engine exists with single-box and multi-package logic.
- EasyPost and multi-provider rate shopping flows are already wired.

The highest-impact next step is to **formalize tenant boundaries and decision services** so every shipment decision is auditable, repeatable, and safely isolated by tenant.

---

## What is already strong in the current app

1. **Company-scoped auth and authorization pattern**
   - Existing helper DB functions and RLS policies indicate a strong start for multi-tenant data separation.
2. **Practical cartonization implementation**
   - Single-box recommendation path validates both volume and geometric fit.
   - Multi-package fallback supports real-world shipments that cannot fit into a single carton.
3. **Rate shopping orchestration exists**
   - EasyPost and Shippo rates are combined and normalized in one place, which makes future carrier expansion easier.
4. **Packaging intelligence hooks exist**
   - Inventory/alert flows indicate you already track operational quality, not only transaction execution.

---

## Primary architecture gaps to address next

## 1) Multi-tenant hardening (critical)

Current code often filters by `company_id` in hooks/services. Keep that, but move critical boundaries to backend guarantees:

- Enforce tenant scoping in all write paths with DB constraints and RLS `WITH CHECK` rules.
- For edge functions, assert `company_id` from authenticated user context server-side, not from client payload.
- Add tenant-safe idempotency keys per operation (`company_id + external_ref + action`).
- Add a periodic "tenant leakage" audit query suite in CI to detect any cross-company joins or orphaned records.

## 2) Box recommendation quality (critical)

Your engine already uses 3D checks and utilization scoring. To align with “smallest box that fits” plus operational reality:

- Make objective explicit and configurable per tenant:
  - `smallest_fit` (volume-minimizing)
  - `lowest_landed_cost` (carton + postage + material + pick/pack labor)
  - `damage_risk_min` (void ratio/fragility)
- Add deterministic tie-breakers: smallest outer volume -> lowest dimensional weight -> lowest box cost.
- Persist **why** a box was chosen (score breakdown, rejected candidates, rule version).
- Separate algorithm versioning from code deploy (`cartonization_rules.version`) for safer experimentation.

## 3) Rate shopping strategy (critical)

The system already combines providers, but you should formalize a policy engine:

- Define tenant-level rate policy:
  - allow/deny carriers/services
  - max transit days
  - minimum on-time performance score
  - signature/insurance thresholds
- Return at least top 3 options (`cheapest`, `fastest`, `best_value`) and mark recommended choice by policy.
- Store a complete decision snapshot: request, normalized rates, selected rate, and policy rule ids.
- Add fallback behavior if one provider fails (you already partially do this): classify as `degraded_mode` and surface in UI + analytics.

## 4) Domain boundary clarity between TMS and WMS (high)

Avoid coupling shipment execution and warehouse execution in one transaction script:

- WMS bounded context: inventory, bins, waves, pick/pack/ship workflow.
- TMS bounded context: carrier procurement, label purchase, tracking, billing/reconciliation.
- Introduce a shared `shipment_plan` aggregate bridging both contexts with immutable snapshots.

## 5) Observability and operational controls (high)

- Add end-to-end trace id per order/shipment lifecycle.
- Structured logs (`company_id`, `shipment_id`, `algorithm_version`, `provider`, `latency_ms`, `decision_mode`).
- SLOs:
  - cartonization p95 latency
  - rate shopping p95 latency
  - quote success rate by provider
  - recommendation override rate at pack station

---

## Recommended target architecture

## A) Decision services

Create two backend decision services:

1. `PackagingDecisionService`
   - Input: order lines, item dimensions, tenant packaging catalog, policy profile.
   - Output: recommended package plan (single/multi), ranked alternatives, explanation.

2. `RateDecisionService`
   - Input: ship-from/to, package plan, tenant carrier policy, SLA preferences.
   - Output: normalized quotes, ranked recommendations, selected quote candidate.

Both services should be called from edge/server only, never trusted from client calculations.

## B) Configuration-driven policy model

Add tenant-specific policy tables:

- `tenant_packaging_policies`
- `tenant_rate_policies`
- `tenant_service_constraints`
- `decision_policy_versions`

All decisions reference a policy version id for reproducibility.

## C) Event-driven workflow

Emit domain events:

- `shipment.planned`
- `packaging.recommended`
- `packaging.overridden`
- `rates.quoted`
- `rate.selected`
- `label.purchased`

Use these for analytics, alerting, and downstream integrations without tight coupling.

---

## Data model additions to consider

- `shipment_decisions`
  - `company_id`, `order_id`, `decision_type` (`packaging`/`rate`), `inputs_json`, `outputs_json`, `policy_version`, `algorithm_version`, `created_by`
- `packaging_recommendation_scores`
  - candidate box level metrics (fit, utilization, dim_weight, cost components)
- `rate_quote_snapshots`
  - normalized provider payloads + transformed schema + decision metadata
- `shipment_override_reasons`
  - track human override categories (customer request, fragile item, carrier preference, etc.)

---

## Implementation roadmap (practical)

## Phase 1 (1-2 sprints)
- Add persisted decision snapshots for packaging + rate shopping.
- Introduce tenant-level policy tables with defaults.
- Add explicit ranking outputs (`cheapest`, `fastest`, `best_value`) in quote response.

## Phase 2 (2-4 sprints)
- Split calculation logic into dedicated backend decision services.
- Add algorithm/policy versioning and replay tooling.
- Add structured observability dashboards.

## Phase 3 (ongoing)
- Add ML-assisted cartonization calibration using historical outcomes.
- Add carrier performance feedback loop (actual transit vs promised).
- Add tenant-specific A/B policy experiments with guardrails.

---

## Quick wins you can do immediately

1. Add `decision_explanation` JSON to current shipment/quote persistence.
2. Add deterministic tie-breaker ordering in cartonization candidate sort.
3. Add a `recommended_reason_code` field for UI transparency.
4. Add `degraded_mode` indicator when one provider is unavailable.
5. Log algorithm and policy version in every recommendation event.

---

## Product UX suggestions (pack station + dispatch)

- At pack station show:
  - recommended box
  - confidence
  - savings vs second-best option
  - one-click override with mandatory reason
- At dispatch show:
  - cheapest / fastest / best value tabs
  - SLA risk badge
  - carrier reliability indicator
- Post-shipment analytics:
  - “box too large” trend
  - “carrier selected vs recommended” variance
  - realized savings vs baseline

---

## Suggested north-star KPIs

- Packaging cost per shipment
- Cubic utilization % at ship confirmation
- Dim-weight penalty rate
- Rate quote success rate
- Label purchase conversion rate
- On-time delivery % by selected service
- Manual override rate (packaging and rate)


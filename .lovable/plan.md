
# Keep Shopify line items visible after shipment sync

## Goal

Make Shopify fulfillments behave the same for every company so that when a shipment is marked shipped:
- tracking is added correctly
- Shopify auto-detects the carrier from the tracking number
- the fulfilled line items still remain visible on the Shopify order

## Root cause

The shared `shopify-update-fulfillment` edge function is doing two things that can break the Shopify fulfillment display:

1. It sends extra tracking fields (`company`, `url`) instead of only the tracking number.
2. The fulfillment creation depends on matching package items to Shopify fulfillment-order line items; when matching is fragile or logs are sparse, it is hard to verify that the exact shipped items were included.

The disappearing-items issue is global because this logic lives in the shared fulfillment sync function used by all tenants.

## Plan

### 1. Simplify the Shopify fulfillment payload
Update `supabase/functions/shopify-update-fulfillment/index.ts` so both fulfillment paths:
- `handleFulfillmentServiceFlow`
- `handleLegacyFlow`

send only:

```ts
trackingInfo: {
  number: trackingNumber
}
```

Do not send `company` or `url` to Shopify. Keep Shopify carrier detection fully automatic.

### 2. Preserve exact shipped line items
Keep the current package-based fulfillment behavior, where Shopify is told exactly which fulfillment-order line items were shipped, but tighten the logic so it is reliable:

- Continue using `order_shipments.package_info.items` as the source of what this package shipped.
- Keep variant ID as the highest-priority match, then SKU, then name.
- Normalize values before comparison so matching is less brittle:
  - trim whitespace
  - compare case-insensitively for SKU/name
  - normalize Shopify GIDs before comparing variant IDs
- Clamp fulfilled quantity to the remaining fulfillable quantity on the fulfillment order line item.

This preserves partial-fulfillment behavior while ensuring the fulfillment sent to Shopify always contains the right items.

### 3. Add a safe guard for empty matches
Add a defensive branch before calling Shopify:

- If package items exist but produce zero matched fulfillment-order line items, do not create a fulfillment silently.
- Instead:
  - log a detailed sync error with shipped items and fulfillment-order line items
  - return a clear error response
  - leave the fulfillment order open rather than creating a malformed fulfillment

This prevents bad fulfillments that could make the Shopify order look broken.

### 4. Improve traceability in sync logs
Expand `shopify_sync_logs.metadata` and mapping metadata written by `shopify-update-fulfillment` to capture:
- tracking number sent to Shopify
- whether fulfillment service or legacy flow was used
- matched item count
- shipped item summary
- fulfillment-order item summary
- whether matching used variant ID, SKU, or name

This will make future fulfillment-display issues much faster to diagnose without per-company custom logic.

### 5. Keep purchase-label behavior unchanged
Do not change the global trigger point in `supabase/functions/purchase-label/index.ts` except to keep passing the same shipment context. It already enriches `package_info.items` with Shopify variant IDs, which supports accurate line-item matching.

### 6. Validate the fix against both sync paths
After implementation, validate the shared behavior for:
- stores using fulfillment service flow
- stores using legacy flow

For each, confirm:
- `fulfillmentCreate` is called with `trackingInfo.number` only
- the created fulfillment contains non-empty line items
- Shopify order page still shows the fulfilled items after shipment
- tracking appears and carrier is auto-detected by Shopify

## Files to update

- `supabase/functions/shopify-update-fulfillment/index.ts`

## No schema changes

- No database migration
- No UI changes
- No per-company branching

## Technical details

Current risky payload in both flows:

```ts
trackingInfo: {
  number: trackingNumber,
  url: trackingUrl,
  company: carrier
}
```

Target payload:

```ts
trackingInfo: {
  number: trackingNumber
}
```

Matching hardening will stay within the existing fulfillment creation flow so the app continues to support exact-package and partial-shipment syncing.

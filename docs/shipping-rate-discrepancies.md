# Shipping Rate Discrepancy Troubleshooting

When a rate shown in the app does not match a rate seen in a single carrier portal (such as EasyPost), verify the following:

## Why app rates may differ from EasyPost portal rates

1. **The app uses multi-provider rate shopping**
   - The app aggregates rates from **EasyPost**, **Shippo**, and **Easyship** in one list.
   - A rate shown with a carrier label like "UPS" may come from Shippo or Easyship, not necessarily EasyPost.

2. **Markup is applied in the app before display/purchase**
   - Company markup is applied to all returned rates before users see/select them.
   - Markup can be percentage or fixed-dollar.

3. **Provider accounts can expose different carrier availability**
   - A carrier absent in EasyPost portal can still appear in-app if another provider (Shippo/Easyship) returned it.

## Quick verification steps for support

1. Confirm the **provider badge** on the app rate (EasyPost / Shippo / Easyship).
2. Compare the app's selected rate to the same provider's portal response (not just EasyPost).
3. Check company `markup_type` and `markup_value`.
4. If needed, inspect the selected rate payload and compare:
   - base rate (`original_rate`)
   - marked-up rate (`rate`)

## Key implementation references

- Multi-provider aggregation: `src/services/rateShoppingService.ts`
- Markup calculation: `src/utils/rateMarkupUtils.ts`
- Shipment options using marked-up rates: `src/components/shipment/ShippingOptionsSection.tsx`
- EasyPost shipment edge function: `supabase/functions/create-shipment/index.ts`
- Shippo shipment edge function: `supabase/functions/create-shippo-shipment/index.ts`

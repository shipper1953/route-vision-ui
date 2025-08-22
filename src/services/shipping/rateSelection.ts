import { supabase } from "@/integrations/supabase/client";
import { normalizeRates } from "./serviceNormalizer";
import type { CompanyShippingPrefs, NormalizedRate, ShippingRule } from "@/types/shippingRules";

async function getCurrentUserAndCompany(): Promise<{ userId: string | null; companyId: string | null }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;
    if (!userId) return { userId: null, companyId: null };
    const { data, error } = await supabase.rpc('get_user_profile', { user_id: userId });
    if (error) {
      console.warn('get_user_profile error:', error);
      return { userId, companyId: null };
    }
    const companyId = Array.isArray(data) && data.length ? (data[0] as any).company_id : null;
    return { userId, companyId };
  } catch (e) {
    console.warn('Failed to load user/company:', e);
    return { userId: null, companyId: null };
  }
}

async function fetchCompanyPrefs(companyId: string | null): Promise<CompanyShippingPrefs | null> {
  if (!companyId) return null;
  const { data, error } = await supabase
    .from('company_shipping_prefs')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();
  if (error) {
    console.warn('fetchCompanyPrefs error:', error);
    return null;
  }
  return data as any;
}

async function fetchActiveRules(companyId: string | null): Promise<ShippingRule[]> {
  if (!companyId) return [];
  const { data, error } = await supabase
    .from('shipping_rules')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('priority', { ascending: false });
  if (error) {
    console.warn('fetchActiveRules error:', error);
    return [];
  }
  return (data ?? []) as any;
}

function filterByPrefs(rates: NormalizedRate[], prefs: CompanyShippingPrefs | null): NormalizedRate[] {
  if (!prefs) return rates;
  let filtered = rates;
  if (prefs.carrier_whitelist && prefs.carrier_whitelist.length) {
    const allow = new Set(prefs.carrier_whitelist.map((c) => c.toLowerCase()));
    filtered = filtered.filter((r) => allow.has(r.carrier.toLowerCase()));
  }
  if (prefs.service_blacklist && prefs.service_blacklist.length) {
    const block = new Set(prefs.service_blacklist.map((s) => s.toLowerCase()));
    filtered = filtered.filter((r) => !block.has(r.service.toLowerCase()));
  }
  if (prefs.max_transit_days != null) {
    filtered = filtered.filter((r) => (r.delivery_days ?? 999) <= (prefs.max_transit_days as number));
  }
  return filtered;
}

function applyRules(rates: NormalizedRate[], rules: ShippingRule[]): NormalizedRate[] {
  if (!rules.length) return rates;
  return rates.filter((r) => {
    for (const rule of rules) {
      const c = rule.conditions || {};
      if (c.carriers_block?.some((x) => r.carrier.toLowerCase() === x.toLowerCase())) return false;
      if (c.services_block?.some((x) => r.service.toLowerCase() === x.toLowerCase())) return false;
      if (c.carriers_allow && !c.carriers_allow.map((x) => x.toLowerCase()).includes(r.carrier.toLowerCase())) return false;
      if (c.services_allow && !c.services_allow.map((x) => x.toLowerCase()).includes(r.service.toLowerCase())) return false;
      if (c.max_transit_days != null && (r.delivery_days ?? 999) > c.max_transit_days) return false;
    }
    return true;
  });
}

function scoreBalanced(r: NormalizedRate, priceRank: number, speedRank: number, ruleBoost: number): number {
  // lower is better
  return priceRank * 0.6 + speedRank * 0.4 - ruleBoost;
}

function computeRuleBoost(r: NormalizedRate, rules: ShippingRule[]): number {
  let boost = 0;
  for (const rule of rules) {
    const a = rule.actions || {};
    if (a.boost_carriers && a.boost_carriers[r.carrier]) boost += a.boost_carriers[r.carrier];
    if (a.boost_services && a.boost_services[r.service]) boost += a.boost_services[r.service];
  }
  return boost;
}

export async function recommendRate(combined: any, requiredDeliveryDate?: string | null): Promise<NormalizedRate | any> {
  const { companyId } = await getCurrentUserAndCompany();
  const [prefs, rules] = await Promise.all([
    fetchCompanyPrefs(companyId),
    fetchActiveRules(companyId)
  ]);

  const normalized = normalizeRates(combined.rates || []);
  if (!normalized.length) return null;

  // Pref filters
  let candidates = filterByPrefs(normalized, prefs);
  candidates = applyRules(candidates, rules);
  if (!candidates.length) candidates = normalized; // fallback to any

  // Required delivery date logic
  if (requiredDeliveryDate) {
    const req = new Date(requiredDeliveryDate);
    const withinDate = candidates.filter((r) => {
      if (r.delivery_date) return new Date(r.delivery_date) <= req;
      if (r.delivery_days != null) {
        const eta = new Date();
        eta.setDate(eta.getDate() + (r.delivery_days as number));
        return eta <= req;
      }
      return false;
    });
    // If any rates meet the required delivery date, recommend the cheapest among them
    if (withinDate.length) {
      const cheapestWithin = [...withinDate].sort((a, b) => a.rate - b.rate)[0];
      return cheapestWithin;
    }
  }

  // Sort by SLA preference
  const byPrice = [...candidates].sort((a, b) => a.rate - b.rate);
  const bySpeed = [...candidates].sort((a, b) => a.speed_rank - b.speed_rank || (a.delivery_days ?? 99) - (b.delivery_days ?? 99));

  const pickCheapest = () => byPrice[0];
  const pickFastest = () => bySpeed[0];

  if (!prefs || prefs.sla_preference === 'balanced') {
    // Balanced scoring combining price and speed
    const priceRanks = new Map<string, number>();
    byPrice.forEach((r, i) => priceRanks.set(r.id, i + 1));
    const speedRanks = new Map<string, number>();
    bySpeed.forEach((r, i) => speedRanks.set(r.id, i + 1));

    let best: { r: NormalizedRate; score: number } | null = null;
    for (const r of candidates) {
      const boost = computeRuleBoost(r, rules);
      const score = scoreBalanced(r, priceRanks.get(r.id) || 999, speedRanks.get(r.id) || 999, boost);
      if (!best || score < best.score) best = { r, score };
    }
    return best?.r ?? pickCheapest();
  }
  if (prefs.sla_preference === 'fastest') return pickFastest();
  if (prefs.sla_preference === 'cheapest') return pickCheapest();
  return pickCheapest();
}

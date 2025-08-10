import { NormalizedRate } from "@/types/shippingRules";

// Heuristic mapping for service normalization; can be extended via DB table service_mappings
function inferNormalizedService(carrier: string, service: string): { norm: NormalizedRate["normalized_service"]; rank: number } {
  const s = `${carrier} ${service}`.toLowerCase();
  // Overnight / 1-day
  if (/overnight|next\s*day|priority mail express|express saver|1 ?day/.test(s)) return { norm: 'overnight', rank: 1 };
  // 2-day
  if (/2\s*day|2-day|second day|2nd day|priority mail$/.test(s)) return { norm: '2_day', rank: 2 };
  // 3-day
  if (/3\s*day|3-day|third day|3rd day|express 3 day|ups saver/.test(s)) return { norm: '3_day', rank: 3 };
  // Ground / Standard
  if (/ground|standard|home delivery|parcel select|surepost|smartpost/.test(s)) return { norm: 'ground', rank: 5 };
  // Fallback standard
  return { norm: 'standard', rank: 4 };
}

export function normalizeRawRate(rate: any): NormalizedRate | null {
  try {
    const rateNum = parseFloat(rate.rate ?? rate.amount);
    if (Number.isNaN(rateNum)) return null;
    const carrier = (rate.carrier || rate.provider || '').toString();
    const service = (rate.service || rate.servicelevel?.name || 'Standard').toString();
    const { norm, rank } = inferNormalizedService(carrier, service);

    const delivery_days = rate.delivery_days ?? rate.est_delivery_days ?? rate.estimated_days ?? null;

    return {
      id: rate.id || rate.object_id,
      provider: rate.provider || 'easypost',
      carrier,
      service,
      rate: rateNum,
      currency: rate.currency,
      delivery_days,
      delivery_date: rate.delivery_date ?? null,
      speed_rank: rank,
      normalized_service: norm,
      original: rate,
    };
  } catch {
    return null;
  }
}

export function normalizeRates(rates: any[]): NormalizedRate[] {
  return rates.map(normalizeRawRate).filter(Boolean) as NormalizedRate[];
}

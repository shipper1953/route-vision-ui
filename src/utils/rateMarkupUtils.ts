
import { SmartRate, Rate } from "@/services/easypost";
import { Company } from "@/types/auth";

export interface MarkedUpRate extends Rate {
  original_rate: string;
  markup_applied: number;
}

export interface MarkedUpSmartRate extends SmartRate {
  original_rate: string;
  markup_applied: number;
}

export function applyMarkupToRate(
  rate: Rate | SmartRate, 
  company: Company | null
): MarkedUpRate | MarkedUpSmartRate {
  if (!company || !company.markup_value || company.markup_value <= 0) {
    // No markup to apply
    return {
      ...rate,
      original_rate: rate.rate,
      markup_applied: 0
    } as MarkedUpRate | MarkedUpSmartRate;
  }

  const originalAmount = parseFloat(rate.rate);
  let markedUpAmount = originalAmount;
  let markupApplied = 0;

  if (company.markup_type === 'percentage') {
    markupApplied = originalAmount * (company.markup_value / 100);
    markedUpAmount = originalAmount + markupApplied;
  } else if (company.markup_type === 'fixed') {
    markupApplied = company.markup_value;
    markedUpAmount = originalAmount + markupApplied;
  }

  return {
    ...rate,
    rate: markedUpAmount.toFixed(2),
    original_rate: rate.rate,
    markup_applied: markupApplied
  } as MarkedUpRate | MarkedUpSmartRate;
}

export function applyMarkupToRates(
  rates: (Rate | SmartRate)[], 
  company: Company | null
): (MarkedUpRate | MarkedUpSmartRate)[] {
  return rates.map(rate => applyMarkupToRate(rate, company));
}

export function getOriginalRateAmount(rate: Rate | SmartRate | MarkedUpRate | MarkedUpSmartRate): number {
  if ('original_rate' in rate) {
    return parseFloat(rate.original_rate);
  }
  return parseFloat(rate.rate);
}

export function getMarkupAmount(rate: MarkedUpRate | MarkedUpSmartRate): number {
  return rate.markup_applied || 0;
}

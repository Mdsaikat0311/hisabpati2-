import { SUPPORTED_CONVERTER_CURRENCIES } from '../data/currencies';

const KEY_RATES_JSON = 'hp_fx_rates_per_usd_v1';
const KEY_LAST_UPDATED = 'hp_fx_last_updated_v1';
const KEY_CUSTOM_OVERRIDES = 'hp_fx_custom_overrides_v1';
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

const PRIMARY_API_URL = 'https://open.er-api.com/v6/latest/USD';
const FALLBACK_API_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

export interface RateFetchResult {
  isLiveSuccess: boolean;
  ratesPerUsd: Record<string, number>;
  lastUpdatedMillis: number;
}

export function pairKey(fromCode: string, toCode: string): string {
  return `${fromCode}_${toCode}`;
}

export function getDefaultRatesPerUsd(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const c of SUPPORTED_CONVERTER_CURRENCIES) {
    map[c.code] = c.defaultRatePerUsd;
  }
  return map;
}

export function loadCachedRatesPerUsd(): Record<string, number> {
  const defaults = getDefaultRatesPerUsd();
  try {
    const raw = localStorage.getItem(KEY_RATES_JSON);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const c of SUPPORTED_CONVERTER_CURRENCIES) {
      const val = Number(parsed[c.code]);
      if (Number.isFinite(val) && val > 0) {
        defaults[c.code] = val;
      }
    }
    return defaults;
  } catch {
    return defaults;
  }
}

export function getLastRatesUpdatedMillis(): number {
  try {
    return Number(localStorage.getItem(KEY_LAST_UPDATED) || '0') || 0;
  } catch {
    return 0;
  }
}

export function shouldAutoRefreshRates(): boolean {
  const last = getLastRatesUpdatedMillis();
  if (last <= 0) return true;
  return Date.now() - last >= SIX_HOURS_MS;
}

export function loadCustomRateOverrides(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY_CUSTOM_OVERRIDES);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const num = Number(v);
      if (Number.isFinite(num) && num > 0) out[k] = num;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveCustomRateOverride(
  fromCode: string,
  toCode: string,
  rate: number
): Record<string, number> {
  const current = loadCustomRateOverrides();
  if (fromCode === toCode || !Number.isFinite(rate) || rate <= 0) return current;
  current[pairKey(fromCode, toCode)] = rate;
  delete current[pairKey(toCode, fromCode)];
  try {
    localStorage.setItem(KEY_CUSTOM_OVERRIDES, JSON.stringify(current));
  } catch {
    // ignore storage quota errors
  }
  return current;
}

export function clearCustomRateOverride(fromCode: string, toCode: string): Record<string, number> {
  const current = loadCustomRateOverrides();
  delete current[pairKey(fromCode, toCode)];
  delete current[pairKey(toCode, fromCode)];
  try {
    localStorage.setItem(KEY_CUSTOM_OVERRIDES, JSON.stringify(current));
  } catch {
    // ignore
  }
  return current;
}

export function getLivePairRate(
  fromCode: string,
  toCode: string,
  ratesPerUsd: Record<string, number>
): number {
  if (fromCode === toCode) return 1;
  const fromPerUsd = ratesPerUsd[fromCode] || 1;
  const toPerUsd = ratesPerUsd[toCode] || 1;
  if (fromPerUsd <= 0) return 1;
  return toPerUsd / fromPerUsd;
}

export function getEffectivePairRate(
  fromCode: string,
  toCode: string,
  ratesPerUsd: Record<string, number>,
  customOverrides: Record<string, number>
): { rate: number; isCustom: boolean } {
  if (fromCode === toCode) return { rate: 1, isCustom: false };
  const direct = customOverrides[pairKey(fromCode, toCode)];
  if (direct && direct > 0) return { rate: direct, isCustom: true };
  const inverse = customOverrides[pairKey(toCode, fromCode)];
  if (inverse && inverse > 0) return { rate: 1 / inverse, isCustom: true };
  return { rate: getLivePairRate(fromCode, toCode, ratesPerUsd), isCustom: false };
}

export async function fetchLiveExchangeRates(): Promise<RateFetchResult> {
  let fetched: Record<string, number> | null = null;

  try {
    const res = await fetch(PRIMARY_API_URL, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const json = (await res.json()) as { rates?: Record<string, number> };
      if (json.rates) {
        fetched = {};
        for (const c of SUPPORTED_CONVERTER_CURRENCIES) {
          const val = Number(json.rates[c.code]);
          if (Number.isFinite(val) && val > 0) fetched[c.code] = val;
        }
      }
    }
  } catch {
    fetched = null;
  }

  if (!fetched || Object.keys(fetched).length === 0) {
    try {
      const res = await fetch(FALLBACK_API_URL, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const json = (await res.json()) as { usd?: Record<string, number> };
        if (json.usd) {
          fetched = {};
          for (const c of SUPPORTED_CONVERTER_CURRENCIES) {
            const val = Number(json.usd[c.code.toLowerCase()]);
            if (Number.isFinite(val) && val > 0) fetched[c.code] = val;
          }
        }
      }
    } catch {
      fetched = null;
    }
  }

  if (fetched && Object.keys(fetched).length > 0) {
    const merged = { ...loadCachedRatesPerUsd(), ...fetched, USD: 1.0 };
    const now = Date.now();
    try {
      localStorage.setItem(KEY_RATES_JSON, JSON.stringify(merged));
      localStorage.setItem(KEY_LAST_UPDATED, String(now));
    } catch {
      // ignore
    }
    return { isLiveSuccess: true, ratesPerUsd: merged, lastUpdatedMillis: now };
  }

  return {
    isLiveSuccess: false,
    ratesPerUsd: loadCachedRatesPerUsd(),
    lastUpdatedMillis: getLastRatesUpdatedMillis(),
  };
}

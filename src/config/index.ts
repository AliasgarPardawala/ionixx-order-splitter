/** Env-driven config, read once at boot. Nothing else should read process.env directly. */

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

function envString(name: string, fallback: string): string {
  const raw = process.env[name];
  return raw === undefined || raw === '' ? fallback : raw;
}

export interface AppConfig {
  port: number;
  quantityDecimalPlaces: number;
  defaultStockPrice: number;
  marketOpenUtc: string; // "HH:MM" 24h UTC
  marketCloseUtc: string; // "HH:MM" 24h UTC
  weightSumEpsilon: number;
}

export const config: AppConfig = {
  port: envInt('PORT', 3000),
  quantityDecimalPlaces: envInt('QUANTITY_DECIMAL_PLACES', 3),
  defaultStockPrice: envInt('DEFAULT_STOCK_PRICE', 100),
  marketOpenUtc: envString('MARKET_OPEN_UTC', '13:30'),
  marketCloseUtc: envString('MARKET_CLOSE_UTC', '20:00'),
  weightSumEpsilon: 0.005,
};

import Decimal from 'decimal.js';
import { config } from '../config';

/** Resolves the price for a position: partner-supplied override, else the fixed default. */
export function resolvePrice(overridePrice: number | undefined): Decimal {
  return new Decimal(overridePrice ?? config.defaultStockPrice);
}

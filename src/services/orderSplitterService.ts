import Decimal from 'decimal.js';
import { Allocation, PortfolioPosition } from '../domain/types';
import { resolvePrice } from './pricingService';
import { apportionLargestRemainder, roundTo } from '../utils/rounding';
import { config } from '../config';

/**
 * Splits totalAmount across positions by weight, then converts each dollar
 * amount to a share quantity at the resolved price. Both the dollar split
 * and the quantity split use largest-remainder apportionment so totals
 * reconcile exactly.
 */
export function splitOrder(
  totalAmount: number,
  positions: PortfolioPosition[],
  quantityDecimalPlaces: number = config.quantityDecimalPlaces,
): Allocation[] {
  const total = new Decimal(totalAmount);

  const idealAmounts = positions.map((p) => total.times(p.weight));
  const roundedAmounts = apportionLargestRemainder(idealAmounts, 2);

  const prices = positions.map((p) => resolvePrice(p.price));
  const idealQuantities = roundedAmounts.map((amount, i) => amount.dividedBy(prices[i]));
  const roundedQuantities = apportionLargestRemainder(idealQuantities, quantityDecimalPlaces);

  return positions.map((position, i) => ({
    symbol: position.symbol,
    weight: position.weight,
    amount: roundTo(roundedAmounts[i], 2).toNumber(),
    price: prices[i].toNumber(),
    quantity: roundTo(roundedQuantities[i], quantityDecimalPlaces).toNumber(),
  }));
}

import Decimal from 'decimal.js';

/** Rounds to decimalPlaces (half-up), via Decimal to avoid float rounding artifacts. */
export function roundTo(value: Decimal.Value, decimalPlaces: number): Decimal {
  return new Decimal(value).toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
}

/**
 * Largest-remainder apportionment: truncates each value, then hands out the
 * leftover remainder one unit at a time to the entries with the largest
 * fractional part, so the rounded total matches the true total.
 */
export function apportionLargestRemainder(
  idealValues: Decimal.Value[],
  decimalPlaces: number,
): Decimal[] {
  if (idealValues.length === 0) return [];

  const unit = new Decimal(10).pow(-decimalPlaces);
  const decimals = idealValues.map((v) => new Decimal(v));

  const truncated = decimals.map((v) => v.toDecimalPlaces(decimalPlaces, Decimal.ROUND_DOWN));
  const remainders = decimals.map((v, i) => v.minus(truncated[i]));

  const idealTotal = decimals.reduce((acc, v) => acc.plus(v), new Decimal(0));
  const truncatedTotal = truncated.reduce((acc, v) => acc.plus(v), new Decimal(0));

  const idealTotalRounded = idealTotal.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
  const gap = idealTotalRounded.minus(truncatedTotal).dividedBy(unit);
  let unitsToDistribute = gap.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();

  const result = [...truncated];
  if (unitsToDistribute <= 0) return result;

  const order = remainders
    .map((r, index) => ({ index, remainder: r }))
    .sort((a, b) => b.remainder.comparedTo(a.remainder));

  for (const { index } of order) {
    if (unitsToDistribute <= 0) break;
    result[index] = result[index].plus(unit);
    unitsToDistribute -= 1;
  }

  return result;
}

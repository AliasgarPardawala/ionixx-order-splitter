import Decimal from 'decimal.js';
import { roundTo, apportionLargestRemainder } from '../../src/utils/rounding';

describe('roundTo', () => {
  it('avoids native float artifacts (0.29 * 100)', () => {
    expect(roundTo(new Decimal('0.29').times(100), 2).toNumber()).toBe(29);
  });
});

describe('apportionLargestRemainder', () => {
  it('reconciles a repeating-decimal split back to the exact total', () => {
    const ideal = [new Decimal(100).dividedBy(3), new Decimal(100).dividedBy(3), new Decimal(100).dividedBy(3)];
    const total = apportionLargestRemainder(ideal, 2).reduce((a, b) => a.plus(b), new Decimal(0));
    expect(total.toNumber()).toBe(100);
  });

  it('breaks remainder ties deterministically while keeping the total exact', () => {
    // Four equal values (each truncates to .25 with a tied .0025 remainder);
    // exactly one leftover cent must go to exactly one of them.
    const ideal = [new Decimal('0.2525'), new Decimal('0.2525'), new Decimal('0.2525'), new Decimal('0.2525')];
    const result = apportionLargestRemainder(ideal, 2);
    const total = result.reduce((a, b) => a.plus(b), new Decimal(0));
    expect(total.toNumber()).toBe(1.01);
    expect(result.filter((r) => r.toNumber() === 0.26)).toHaveLength(1);
    expect(result.filter((r) => r.toNumber() === 0.25)).toHaveLength(3);
  });

  it('distributes a single leftover cent across many positions without losing it', () => {
    // $0.01 split three ways: each ideal share truncates to $0.00, but the
    // total must still reconcile to $0.01.
    const ideal = [new Decimal('0.01').dividedBy(3), new Decimal('0.01').dividedBy(3), new Decimal('0.01').dividedBy(3)];
    const result = apportionLargestRemainder(ideal, 2);
    const total = result.reduce((a, b) => a.plus(b), new Decimal(0));
    expect(total.toNumber()).toBe(0.01);
    expect(result.filter((r) => r.toNumber() > 0)).toHaveLength(1);
  });

  it('handles a single position and an empty list', () => {
    expect(apportionLargestRemainder([new Decimal('42.4242')], 2)[0].toNumber()).toBe(42.42);
    expect(apportionLargestRemainder([], 2)).toEqual([]);
  });
});

import { resolvePrice } from '../../src/services/pricingService';

describe('resolvePrice', () => {
  it('returns the configured default when no override is given', () => {
    expect(resolvePrice(undefined).toNumber()).toBe(100);
  });

  it('returns the override when given', () => {
    expect(resolvePrice(245.32).toNumber()).toBe(245.32);
  });
});
